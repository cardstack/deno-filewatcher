# deno-filewatcher
A Deno websocket server and client that can watch a filesystem. The server
watches the specified directory and notifies the connected clients about any
changes to the files in the watched directory tree. The clients can also request the file contents of the directory being watched.

## Prerequisites
- The [Deno](https://deno.land) runtime:
   ```sh
   curl -fsSL https://deno.land/x/install/install.sh | sh
   ```

## Running
1. First start the server:
   ```sh
   deno --allow-net --allow-read filewatcher-server.ts -d directory/to/watch -p 3000
   ```
   This will start the filewatcher server on port 3000. If you don't specify a port, the server will default to port 8080.
   (use the `--help` to view all the command line options)

2. Next start the client(s):
   ```sh
   deno --allow-net filewatcher-client.ts http://localhost:3000
   ```
   The server URL is optional. If you don't provide the server URL, then the client will default to http://localhost:8080 (which is the default server port)

   The server won't actually start watching the filesystem until there is at least one client connected. And the server will stop watching the filesystem if all the clients disconnect. When a client first connects the server will inform the client about all the files that are in the watched directory. From that point forward the client will receive notifications only for modifed and removed files.

   While the client is running, from the client CLI, you can type:
   ```
   file::my_files/foo.txt
   ```
   to view the contents of the file `my_files/foo.txt` (this is the path relative to the directory being watched).

   Additionally, you can type:
   ```
   close
   ```
   to quit the client session.
