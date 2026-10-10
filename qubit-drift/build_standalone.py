"""Bundle the game into one HTML file that works when opened directly."""
from pathlib import Path
import re
root=Path(__file__).resolve().parent
html=(root/'index.html').read_text()
css=(root/'style.css').read_text()
quantum=re.sub(r'^export ', '', (root/'quantum.js').read_text(), flags=re.MULTILINE)
game=re.sub(r'^import .*?;\n', '', (root/'game.js').read_text(), count=1)
html=html.replace('<link rel="stylesheet" href="style.css">','<style>'+css+'</style>')
html=html.replace('<script type="module" src="game.js"></script>','<script>'+quantum+'\n'+game+'</script>')
(root/'PLAY.html').write_text(html)
print(root/'PLAY.html')
