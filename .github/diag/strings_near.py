# DIAGNOSTIC ONLY (brief 203): the string literals that the functions on the crash stacks load (rip-relative lea into
# .rodata), and the function boundaries around each site, from a stripped libWPEWebKit.
import re, subprocess, sys
lib = sys.argv[1]
sec = subprocess.run(['readelf', '-S', '-W', lib], capture_output=True, text=True).stdout
def section(name):
    for l in sec.splitlines():
        p = l.replace('[ ', '[').split()
        if len(p) > 5 and p[1] == name:
            return int(p[3], 16), int(p[4], 16), int(p[5], 16)
text = section('.text'); ro = section('.rodata')
data = open(lib, 'rb').read()
def cstr(addr):
    if not (ro[0] <= addr < ro[0] + ro[2]): return None
    off = ro[1] + addr - ro[0]
    end = data.find(b'\0', off, off + 300)
    s = data[off:end if end > 0 else off + 120]
    try: s = s.decode()
    except Exception: return None
    return s if len(s) >= 3 and all(32 <= ord(c) < 127 for c in s) else None
for o in sys.argv[2:]:
    a = text[0] + int(o, 16)
    dis = subprocess.run(['objdump', '-d', '-C', '--no-show-raw-insn', f'--start-address={a-1500:#x}', f'--stop-address={a+600:#x}', lib], capture_output=True, text=True).stdout
    found = []
    for m in re.finditer(r'# ([0-9a-f]+)', dis):
        s = cstr(int(m.group(1), 16))
        if s and s not in found: found.append(s)
    print(f'== text+{o} (0x{a:x}): {len(found)} strings within -1500/+600 bytes')
    for s in found[:25]: print('   ', s[:160])
