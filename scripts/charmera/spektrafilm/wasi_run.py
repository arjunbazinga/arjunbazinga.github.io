# Run a WASI module under wasmtime (pip install wasmtime). Node 22's WASI segfaults on these builds.
import sys, time, wasmtime
wasm, root, *args = sys.argv[1:]
cfg = wasmtime.Config(); cfg.wasm_backtrace_details = wasmtime.WasmBacktraceDetails.ENABLE if hasattr(wasmtime, 'WasmBacktraceDetails') else None
engine = wasmtime.Engine(); store = wasmtime.Store(engine)
wasi = wasmtime.WasiConfig(); wasi.argv = ['bake', *args]; wasi.env = [('SPEKTRAFILM_BACKEND', 'cpu'), ('RUST_LOG', 'warn')]
wasi.preopen_dir(root, '/'); wasi.inherit_stdout(); wasi.inherit_stderr(); store.set_wasi(wasi)
linker = wasmtime.Linker(engine); linker.define_wasi()
inst = linker.instantiate(store, wasmtime.Module.from_file(engine, wasm))
t = time.time()
try: inst.exports(store)['_start'](store)
except wasmtime.ExitTrap as e: print('exit', e.code)
print(f'wall {time.time() - t:.2f}s', file=sys.stderr)
