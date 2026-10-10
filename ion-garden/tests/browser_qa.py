"""Real Chromium input/render QA. Run with an installed Playwright + Chromium.

Uses set_content for isolated artifact testing, not a hosted-origin test.
"""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright
root = Path(__file__).resolve().parents[1]

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    page = browser.new_page(viewport={'width':1440,'height':900})
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.set_content((root/'PLAY.html').read_text())
    assert page.locator('#welcome').evaluate('(e)=>e.open')
    page.locator('#begin').click()

    def plant(tool, x, y):
        page.locator(f'[data-tool="{tool}"]').click()
        point = page.evaluate('([x,y])=>{const p=ionGarden.tile(x,y),d=ionGarden.dimensions,r=document.querySelector("canvas").getBoundingClientRect();return {x:r.x+p.x/d.width*r.width,y:r.y+p.y/d.height*r.height}}', [x,y])
        page.mouse.click(point['x'], point['y'])

    plant('lantern',6,4)
    plant('cooler',5,5)
    assert page.evaluate('ionGarden.state.coins') == 20
    assert page.locator('#start-contract').is_enabled()
    page.locator('[data-tool="inspect"]').click()
    page.locator('#start-contract').click()
    page.locator('#pause').click()
    before = page.evaluate('ionGarden.state.run.time')
    page.wait_for_timeout(150)
    assert page.evaluate('ionGarden.state.run.time') == before
    page.locator('#pause').click()
    page.evaluate('()=>{for(let i=0;i<880&&ionGarden.state.run;i++)ionGarden.step(.05)}')
    assert page.locator('#result').evaluate('(e)=>e.open')
    assert page.evaluate('ionGarden.state.lastOutcome.success')
    page.locator('#continue').click()
    for day, placements in [(1,[('habitat',6,3)]),(2,[('habitat',7,4),('lantern',7,3)]),(3,[('habitat',5,3),('cooler',6,5)])]:
        for args in placements: plant(*args)
        page.locator('[data-tool="inspect"]').click()
        assert page.locator('#start-contract').is_enabled(), f'cannot start day {day}'
        page.locator('#start-contract').click()
        page.evaluate('()=>{for(let i=0;i<1600&&ionGarden.state.run;i++)ionGarden.step(.05)}')
        assert page.evaluate('ionGarden.state.lastOutcome.success'), f'failed day {day}'
        page.locator('#continue').click()
    assert page.evaluate('ionGarden.state.completed') == 4
    page.screenshot(path=str(root/'garden-preview.png'))
    page.locator('#guide').click()
    assert page.locator('#field-guide').evaluate('(e)=>e.open')
    page.locator('#close-guide').click()
    page.locator('#new-garden').click()
    page.locator('#cancel-reset').click()
    assert page.evaluate('ionGarden.state.completed') == 4
    # Keyboard navigation plants a flower on a new garden.
    page.locator('#new-garden').click()
    page.locator('#confirm-reset').click()
    page.locator('#garden').focus()
    page.keyboard.press('5')
    page.mouse.move(0,0)
    page.keyboard.press('ArrowRight')
    page.keyboard.press('Enter')
    assert page.evaluate('ionGarden.state.equipment.some(e=>e.type==="flower")')
    page.set_viewport_size({'width':390,'height':844})
    page.wait_for_timeout(100)
    page.screenshot(path=str(root/'mobile-preview.png'))
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    # Test Qollab flattened JS syntax/UI with a mocked documented Python bridge.
    qollab=(root/'qollab/index.html').read_text().replace('<link rel="stylesheet" href="main.css">','<style>'+(root/'qollab/main.css').read_text()+'</style>')
    js=(root/'qollab/main.js').read_text().split('\n',1)[1]
    table={}
    for m in range(8):
        mask=[(m>>q)&1 for q in range(3)]
        for c in range(4):
            clue=[(c>>q)&1 for q in range(2)]
            q=0 if clue==[1,1] else 1 if clue==[1,0] else 2 if clue==[0,1] else -1
            out=list(mask)
            if q>=0: out[q]^=1
            table[''.join(map(str,mask))+':'+''.join(map(str,clue))]=out
    mock='const backend={}; window.bridgeCalls=0; const gardenQuantum={run_json:{callPromising:async()=>{window.bridgeCalls++;return JSON.stringify('+json.dumps({'kernel':table,'shots':128,'counts':{'00000':128}})+');}}};'
    qpage=browser.new_page(viewport={'width':1280,'height':800})
    qpage.on('pageerror',lambda e: errors.append(str(e)))
    qpage.set_content(qollab.replace('</body>','<script>'+mock+js+'</script></body>'))
    qpage.locator('#begin').click()
    assert qpage.evaluate('typeof ionGardenPrepare') == 'function'
    qpage.locator('[data-tool="lantern"]').click()
    qpage.evaluate('()=>{document.querySelector("canvas").dispatchEvent(new PointerEvent("pointerdown",{clientX:ionGarden.tile(6,4).x,clientY:ionGarden.tile(6,4).y,bubbles:true}))}')
    qpage.locator('#start-contract').click()
    qpage.wait_for_timeout(50)
    assert qpage.evaluate('bridgeCalls')==1
    assert qpage.evaluate('!!ionGarden.state.run')
    assert 'Qiskit recovery kernel active' in qpage.locator('#runtime-note').inner_text()
    qpage.evaluate('()=>{for(let i=0;i<880&&ionGarden.state.run;i++)ionGarden.step(.05)}')
    qpage.locator('#continue').click()
    assert qpage.evaluate('bridgeCalls')==1
    assert not errors, errors
    print(json.dumps({'campaign':'4 contracts passed via real UI clicks','pause':'passed','keyboard':'passed','mobile':'390px no overflow','qollab':'mocked bridge kernel installed and used in a contract; one call; live platform not tested','page_errors':errors}))
    browser.close()
