import { serve } from "https://deno.land/std/http/server.ts";
import { posix } from "https://deno.land/std/path/mod.ts";
import {
  acceptWebSocket,
  isWebSocketCloseEvent,
  isWebSocketPingEvent,
  WebSocket
} from "https://deno.land/std/ws/mod.ts";
import { parse } from "https://deno.land/std/flags/mod.ts";
import { readFileStr, walkSync } from "https://deno.land/std/fs/mod.ts";
import Watcher from './watcher.ts';

interface CommandLineArgs {
  p?: number;
  port?: number;
  d?: string;
  directory?: string;
  h?: boolean;
  help?: boolean;
}

const { args, exit } = Deno;
const serverArgs = parse(args) as CommandLineArgs;
if (serverArgs.h ?? serverArgs.help) {
  console.log(`Filewatcher Server
  Runs a websocket filewatcher server

USAGE:
  filewatcher_server [options]

OPTIONS:
  -h, --help                   Prints help information
  -p, --port <PORT>            Set port
  -d, --directory <DIRECTORY>  Set the directory to watch`);
  exit();
}

let rootDir = posix.resolve(serverArgs.directory ?? serverArgs.d ?? "");
let watcher = new Watcher(rootDir);

/** websocket echo server */
const port = serverArgs.port ?? serverArgs.p ?? "8080";
console.log(`websocket server is running on :${port}`);
for await (const req of serve(`:${port}`)) {
  const { headers, conn } = req;
  acceptWebSocket({
    conn,
    headers,
    bufReader: req.r,
    bufWriter: req.w
  })
    .then(
      async (sock: WebSocket): Promise<void> => {
        console.log("socket connected!");
        await watcher.add(sock);
        const it = sock.receive();
        while (true) {
          try {
            const { done, value } = await it.next();
            if (done) {
              break;
            }
            const ev = value;
            if (typeof ev === "string") {
              // text message
              console.log("ws:Text", ev);
              let [cmd, args] = ev.split('::');
              switch (cmd) {
                case 'file':
                  await sock.send(await getFile(rootDir, args));
                default:
                  await sock.send(ev);
              }
            } else if (ev instanceof Uint8Array) {
              // binary message
              console.log("ws:Binary", ev);
            } else if (isWebSocketPingEvent(ev)) {
              const [, body] = ev;
              // ping
              console.log("ws:Ping", body);
            } else if (isWebSocketCloseEvent(ev)) {
              // close
              const { code, reason } = ev;
              watcher.remove(sock);
              console.log("ws:Close", code, reason);
            }
          } catch (e) {
            console.error(`failed to receive frame: ${e}`);
            watcher.remove(sock);
            await sock.close(1000).catch(console.error);
          }
        }
      }
    )
    .catch((err: Error): void => {
      console.error(`failed to accept websocket: ${err}`);
    });
}

async function getFile(rootDir: string, relativePath: string) {
  console.log(`getting file: ${relativePath}`);
  const path = posix.join(rootDir, relativePath);
  return await readFileStr(path);
}
