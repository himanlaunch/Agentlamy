import { createServer } from 'node:http';
import handler from 'serve-handler';

/**
 * Start a local static file server for the given directory.
 * Returns { url, close } where close() stops the server.
 */
export async function startServer(dir, port = 0) {
  const server = createServer((req, res) => {
    return handler(req, res, {
      public: dir,
      cleanUrls: false,
      directoryListing: false,
    });
  });

  return new Promise((resolve, reject) => {
    server.listen(port, '127.0.0.1', () => {
      const addr = server.address();
      const url = `http://127.0.0.1:${addr.port}`;
      resolve({
        url,
        port: addr.port,
        close: () => new Promise((res) => server.close(res)),
      });
    });

    server.on('error', reject);
  });
}
