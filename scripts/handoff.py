"""Build a standalone handoff, or serve an always-current view using --serve."""
from pathlib import Path
import argparse, hashlib, html, re
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'docs/PRODUCTION_HANDOFF.md'
OUTPUT = SOURCE.with_suffix('.html')

def inline(s):
    s = html.escape(s)
    s = re.sub(r'`([^`]+)`', r'<code>\1</code>', s)
    s = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', s)
    return re.sub(r'\[([^\]]+)\]\(([^)]+)\)', lambda m: '<a href="'+m[2]+'">'+m[1]+'</a>' if not re.match(r'(?i)(javascript|data):', m[2]) else m[1], s)

def build():
    source = SOURCE.read_text()
    lines = source.splitlines(); body=[]; nav=[]; i=0; count=0; p0=0
    while i < len(lines):
        line=lines[i]
        if not line.strip(): i+=1; continue
        if line.startswith('```'):
            code=[]; i+=1
            while i<len(lines) and not lines[i].startswith('```'): code.append(lines[i]); i+=1
            body.append('<pre>'+html.escape('\n'.join(code))+'</pre>'); i+=1; continue
        if line.startswith('|'):
            rows=[]
            while i<len(lines) and lines[i].startswith('|'):
                cells=[x.strip() for x in lines[i].strip('|').split('|')]
                if not all(re.fullmatch(r':?-+:?', x) for x in cells): rows.append(cells)
                i+=1
            tracked=rows[0][0]=='ID'
            body.append('<div class="table-wrap" tabindex="0" role="region" aria-label="'+html.escape(rows[0][1]+' table')+'"><table><thead><tr>'+''.join('<th scope="col">'+inline(x)+'</th>' for x in rows[0])+'</tr></thead><tbody>')
            for row in rows[1:]:
                attrs=''
                if tracked:
                    count+=1; p0+=row[-1].startswith('P0')
                    attrs=' class="tracked" data-priority="'+row[-1][:2]+'" data-status="'+html.escape(row[2].split(' —')[0])+'"'
                body.append('<tr'+attrs+'>')
                for n,cell in enumerate(row):
                    content=inline(cell)
                    if tracked and n==2:
                        tone='pending' if cell.startswith('IMPLEMENTED') else 'blocked' if cell.startswith(('BLOCKED','MISSING')) else 'partial'
                        content='<span class="badge '+tone+'">'+content+'</span>'
                    body.append('<td>'+content+'</td>')
                body.append('</tr>')
            body.append('</tbody></table></div>'); continue
        heading=re.match(r'^(#{1,3}) (.*)',line)
        if heading:
            level=len(heading[1]); label=heading[2]; anchor='section-'+str(len(nav))
            if level==2: nav.append((anchor,label))
            body.append(f'<h{level} id="{anchor}">{inline(label)}</h{level}>'); i+=1; continue
        if re.match(r'^\d+\. ',line) or line.startswith('- '):
            ordered=not line.startswith('- '); tag='ol' if ordered else 'ul'; body.append('<'+tag+'>')
            pattern=r'^\d+\. ' if ordered else r'^- '
            while i<len(lines) and re.match(pattern,lines[i]):
                body.append('<li>'+inline(re.sub(pattern,'',lines[i]))+'</li>'); i+=1
            body.append('</'+tag+'>'); continue
        para=[]
        while i<len(lines) and lines[i].strip() and not re.match(r'^(#|\||```|\d+\. |- )',lines[i]): para.append(inline(lines[i])); i+=1
        body.append('<p>'+'<br>'.join(para)+'</p>')
    template=(ROOT/'scripts/handoff-template.html').read_text()
    result=template.replace('{{BODY}}','\n'.join(body)).replace('{{NAV}}',''.join('<a href="#'+a+'">'+inline(t)+'</a>' for a,t in nav)).replace('{{COUNT}}',str(count)).replace('{{P0}}',str(p0)).replace('{{HASH}}',hashlib.sha256(source.encode()).hexdigest())
    OUTPUT.write_text(result)
    return result

class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*a,**kw): super().__init__(*a,directory=str(ROOT),**kw)
    def do_GET(self):
        if self.path in ('/', '/docs/PRODUCTION_HANDOFF.html'):
            content=build().encode(); self.send_response(200); self.send_header('Content-Type','text/html; charset=utf-8'); self.send_header('Cache-Control','no-store'); self.end_headers(); self.wfile.write(content)
        elif self.path=='/handoff-version':
            self.send_response(200); self.send_header('Cache-Control','no-store'); self.end_headers(); self.wfile.write(hashlib.sha256(SOURCE.read_bytes()).hexdigest().encode())
        else: super().do_GET()

if __name__=='__main__':
    parser=argparse.ArgumentParser(); parser.add_argument('--serve',action='store_true'); parser.add_argument('--port',type=int,default=8765); args=parser.parse_args()
    build(); print('Built '+str(OUTPUT),flush=True)
    if args.serve:
        print(f'Live handoff: http://127.0.0.1:{args.port}/docs/PRODUCTION_HANDOFF.html',flush=True)
        ThreadingHTTPServer(('127.0.0.1',args.port),Handler).serve_forever()
