import { digestAll, type HashWorkerRequest, type HashWorkerResponse } from "@/lib/hash";

// Typed loosely: the WebWorker lib conflicts with DOM types.
const scope = self as unknown as {
  postMessage: (message: HashWorkerResponse) => void;
  onmessage: ((event: MessageEvent<HashWorkerRequest>) => void) | null;
};

scope.onmessage = async (event) => {
  const { file, key } = event.data;
  try {
    const bytes = new Uint8Array(file.size);
    const reader = file.stream().getReader();
    let loaded = 0;
    let lastReport = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes.set(value, loaded);
      loaded += value.length;
      if (loaded - lastReport > 4 * 1024 * 1024) {
        lastReport = loaded;
        scope.postMessage({ type: "progress", loaded });
      }
    }
    scope.postMessage({ type: "progress", loaded });
    scope.postMessage({ type: "done", digests: await digestAll(bytes, key) });
  } catch (err) {
    scope.postMessage({ type: "error", message: err instanceof Error ? err.message : "Could not read the file." });
  }
};
