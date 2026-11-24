"""Actual local Next/Chromium workflow tests. All identities/contacts are fictional.
Uses existing worker Python Playwright, no application dependency changes.
python scripts/qa-sa-sponsorship.py [output-directory]
"""
import json, os, pathlib, secrets, subprocess, sys, tempfile, time, urllib.request
from playwright.sync_api import sync_playwright, expect
root=pathlib.Path(__file__).resolve().parents[1]
out=pathlib.Path(sys.argv[1] if len(sys.argv)>1 else '/tmp/sa-proof');out.mkdir(parents=True,exist_ok=True)
base='https://localhost:3133'; endpoint=base+'/api/sa-sponsorship/'; page_url=base+'/salvation-army/sponsorship-review'
code=secrets.token_hex(24);cron=secrets.token_hex(24)
fixture=json.loads(subprocess.check_output(['node','-e',"process.stdout.write(JSON.stringify(require('./scripts/sa-sponsorship-fixture.cjs')))"],cwd=root))
# Exercise multi-line dialing vs non-dialable annotated office provenance.
fixture['prospects'][0]['directPhone']='+1 (202) 555-0104; +1 (202) 555-0105'
fixture['prospects'][0]['officePhone']='+1 (202) 555-0100 (original file; not reverified)'
with tempfile.TemporaryDirectory(prefix='sa-private-fixture-') as storage:
 env={**os.environ,'SA_SPONSORSHIP_LOCAL_DIR':storage,'SA_SPONSORSHIP_ACCESS_CODE':code,'BOARD_REVIEW_SECRET':secrets.token_hex(32),'CRON_SECRET':cron,'NEXT_TELEMETRY_DISABLED':'1'}
 env.pop('VERCEL',None);env.pop('VERCEL_ENV',None);env.pop('NODE_ENV',None)
 key=pathlib.Path(storage)/'local.key';cert=pathlib.Path(storage)/'local.crt'
 subprocess.run(['openssl','req','-x509','-newkey','rsa:2048','-nodes','-keyout',str(key),'-out',str(cert),'-days','1','-subj','/CN=localhost'],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 log=open(out/'local-server.log','w+')
 server=subprocess.Popen(['node','node_modules/next/dist/bin/next','dev','--hostname','localhost','--port','3133','--experimental-https','--experimental-https-key',str(key),'--experimental-https-cert',str(cert)],cwd=root,env=env,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
 try:
  # Block on server readiness output (no polling/sleeps).
  for line in server.stdout:
   log.write(line);log.flush()
   if 'Ready in' in line:break
   if server.poll() is not None:raise RuntimeError('Local Next server failed to start')
  # Drain ongoing compiler output to avoid blocking its pipe.
  import threading
  def drain():
   for line in server.stdout:log.write(line);log.flush()
  threading.Thread(target=drain,daemon=True).start()
  with sync_playwright() as pw:
   browser=pw.chromium.launch(headless=True,args=['--no-sandbox'])
   context=browser.new_context(ignore_https_errors=True,viewport={'width':1440,'height':1100},extra_http_headers={'x-forwarded-proto':'https'})
   req=context.request
   headers={'Origin':'https://localhost:3133','Authorization':'Bearer '+cron}
   response=req.post(endpoint+'admin',data=fixture,headers=headers,timeout=120000);assert response.status==200,response.text()
   page=context.new_page();external=[]
   page.on('request',lambda r:external.append(r.url) if not r.url.startswith(base) else None)
   page.add_init_script("localStorage.setItem('catapult_cookie_consent','accepted')")
   response=page.goto(page_url,wait_until='networkidle',timeout=120000)
   assert 'no-store' in response.headers['cache-control'];assert response.headers['referrer-policy']=='no-referrer';assert 'noindex' in response.headers['x-robots-tag']
   expect(page.get_by_role('heading',name='Board member access')).to_be_visible(timeout=10000)
   assert 'Sample Jordan' not in response.text(),'no contacts in prerender/HTML'
   assert page.title()=='Sponsorship review | The Salvation Army Southwest Division'
   assert not page.locator('meta[property^="og:"],meta[name^="twitter:"]').count(),'no inherited Catapult share metadata'
   assert page.locator('#apollo-tracker').count()==0
   assert not external,external
   page.add_style_tag(content='nextjs-portal{display:none!important}')
   page.screenshot(path=str(out/'desktop-access.png'),full_page=True)
   page.get_by_label('Your name',exact=True).fill('Sample Board Member')
   page.get_by_label('Email address',exact=True).fill('member@example.com')
   page.get_by_label('Board access code').fill(code)
   page.get_by_role('button',name='Open private review').click()
   first=page.get_by_role('article').filter(has=page.get_by_role('heading',name='Sample Desert Community Bank'))
   expect(first).to_be_visible(timeout=10000)
   assert len(first.locator('a[href^="tel:"]').all())==2,'semicolon direct numbers each get one link; annotated office is not dialed'
   expect(first.get_by_text('A = Fully comfortable making the ask to this prospect, serving as the primary solicitor',exact=True)).to_be_visible()
   page.screenshot(path=str(out/'desktop-review.png'),full_page=False)
   first.screenshot(path=str(out/'desktop-company.png'))
   # Keyboard reachable form, explicit save, acknowledged receipt, same-cookie resume.
   first.get_by_role('radio').nth(2).check();first.get_by_label('Comment (optional)').fill('Sample connection — please coordinate with me.')
   first.get_by_role('button',name='Save this company').click()
   expect(first.get_by_role('status')).to_contain_text('Saved · revision 1')
   page.reload(wait_until='networkidle');expect(first.get_by_role('radio').nth(2)).to_be_checked()
   expect(first.get_by_label('Comment (optional)')).to_have_value('Sample connection — please coordinate with me.')
   # Lost network response: retain draft, keep exact operation ID, retry without clearing edits.
   first.get_by_role('radio').nth(1).check();first.get_by_label('Comment (optional)').fill('Sample revised connection')
   failed=[]
   def fail_once(route):
    if route.request.method=='POST' and not failed:
     failed.append(json.loads(route.request.post_data));route.abort('failed')
    else:route.continue_()
   page.route('**/api/sa-sponsorship/review',fail_once)
   first.get_by_role('button',name='Save this company').click()
   expect(first.get_by_role('button',name='Retry same save')).to_be_enabled()
   expect(first.get_by_label('Comment (optional)')).to_have_value('Sample revised connection')
   first.get_by_role('button',name='Retry same save').click();expect(first.get_by_role('status')).to_contain_text('Saved · revision 2')
   page.unroute('**/api/sa-sponsorship/review',fail_once)
   # Unsaved draft is preserved across search and paging, not unmounted.
   first.get_by_label('Comment (optional)').fill('Sample unsaved draft')
   page.get_by_label('Find a company or contact').fill('Company 12');expect(first).not_to_be_visible()
   page.get_by_label('Find a company or contact').fill('');expect(first.get_by_label('Comment (optional)')).to_have_value('Sample unsaved draft')
   page.get_by_role('button',name='Next →').click();expect(first).not_to_be_visible()
   page.get_by_role('button',name='← Previous').click();expect(first.get_by_label('Comment (optional)')).to_have_value('Sample unsaved draft')
   # Restore acknowledged value before mobile screenshot / leaving.
   first.get_by_label('Comment (optional)').fill('Sample revised connection')
   page.set_viewport_size({'width':390,'height':844})
   page.add_style_tag(content='nextjs-portal{display:none!important}')
   page.evaluate('window.scrollTo(0,0)')
   page.screenshot(path=str(out/'mobile-review.png'),full_page=False)
   first.screenshot(path=str(out/'mobile-company.png'))
   assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'),'no mobile horizontal overflow'
   assert not external,external
   # New login same email is a fresh member, never an email-only account lookup.
   other=browser.new_context(ignore_https_errors=True,extra_http_headers={'x-forwarded-proto':'https'})
   login=other.request.post(endpoint+'session',data={'name':'Sample Board Member','email':'member@example.com','code':code},headers={'Origin':'https://localhost:3133'});assert login.status==200,login.text()
   isolated=other.request.get(endpoint+'review');assert isolated.status==200;assert isolated.json()['responses']==[]
   exported=req.get(endpoint+'admin',headers={'Authorization':'Bearer '+cron});assert exported.status==200;assert len(exported.json()['responses'])==2
   # End-session clears capability without deleting append-only receipts.
   assert other.request.delete(endpoint+'session',headers={'Origin':'https://localhost:3133'}).status==200
   assert other.request.get(endpoint+'review').status==401
   other.close();context.close();browser.close()
  (out/'rendered-tests.txt').write_text('PASS: actual Next + Chromium desktop/mobile access, no private contacts in HTML, no third-party tracking with prior consent, secure session, exact choices, separated tel links, explicit save, browser resume, retry preserved edits, pagination/search retained draft, no overflow, same-email isolation, export and logout.\n')
  print((out/'rendered-tests.txt').read_text())
 finally:
  server.terminate()
  try:server.wait(timeout=15)
  except subprocess.TimeoutExpired:server.kill();server.wait()
  log.close()
