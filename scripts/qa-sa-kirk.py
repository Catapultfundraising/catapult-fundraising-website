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
filter_only=os.environ.get('SA_MEMBER_FILTER_PROOF')=='1'
source_only=os.environ.get('SA_SOURCE_DISPLAY_PROOF')=='1'
source_before=os.environ.get('SA_SOURCE_DISPLAY_BEFORE')=='1'
fixture=json.loads(subprocess.check_output(['node','-e',"process.stdout.write(JSON.stringify(require('./scripts/sa-sponsorship-fixture.cjs')))"],cwd=root))
final_only=os.environ.get('SA_FINAL_QUESTION_PROOF')=='1'
final_before=os.environ.get('SA_FINAL_QUESTION_BEFORE')=='1'
if final_only:
 fixture['prospects']=[{**fixture['prospects'][0],'id':f'sample-{i+1}','organization':f'Sample Company {i+1:02}'} for i in range(23)]
# Exercise multi-line dialing vs non-dialable annotated office provenance.
fixture['prospects'][0]['directPhone']='+1 (202) 555-0104; +1 (202) 555-0105'
fixture['prospects'][0]['officePhone']='+1 (202) 555-0100 (original file; not reverified)'
if source_only:
 fixture['prospects'][1]['officePhone']='+1 (202) 555-0110 ext. 42 (company record)'
 fixture['prospects'][2]['officePhone']='+1 (202) 555-0120 (published office line)'
 fixture['prospects'][2]['contactFit']='Public-source contact; see role'
if filter_only:
 template=fixture['prospects'][0]
 fixture['prospects']=[{**template,'id':f'sample-{i+1}','organization':'Sample Desert Community Bank' if i==0 else f'Sample Community Company {i+1}','contactName':'' if i<20 or i==21 else 'Sample Contact','email':'work@example.com' if i in [20,21,23,26] else '','directPhone':'+1 202-555-0100' if i in [20,21,22,26] else '','officePhone':'(202) 555-0100 (original file; not reverified)' if i in [23,24] else '','portals':[{**template['portals'][0],'email':'shared@example.com'}] if i==25 else []} for i in range(27)]
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
   if filter_only:
    configured=req.put(endpoint+'admin',data={'rosterVersion':fixture['version'],'topProspectIds':[p['id'] for p in fixture['prospects'][:20]]},headers=headers)
    assert configured.status==200,configured.text()
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
   before=os.environ.get('SA_KIRK_BEFORE')=='1'
   articles=page.locator('.sa-prospect:visible')
   expect(articles.first).to_be_visible(timeout=10000)
   if final_only:
    question=page.locator('.sa-suggestions');suggestions=page.locator('#sa-other')
    search=page.get_by_label('Find a company or contact')
    next_page=page.get_by_role('button',name='Next →')
    previous=page.get_by_role('button',name='← Previous')
    def last_page():
     next_page.click();expect(page.get_by_text('Page 2 of 3',exact=True)).to_be_visible()
     next_page.click();expect(page.get_by_text('Page 3 of 3',exact=True)).to_be_visible()
    def capture(name):
     page.locator('.sa-pagination').scroll_into_view_if_needed()
     page.screenshot(path=str(out/name))
    assert question.count()==1 and suggestions.count()==1
    capture('before-page1.png' if final_before else 'after-page1.png')
    if final_before:
     expect(question).to_be_visible()
     last_page();expect(question).to_be_visible();capture('before-lastpage.png')
     (out/'final-question-browser.txt').write_text('BEFORE reproduced: optional final question visible on both page 1 and page 3 of full synthetic roster.\n')
    else:
     expect(question).to_be_hidden()
     next_page.click();expect(page.get_by_text('Page 2 of 3',exact=True)).to_be_visible();expect(question).to_be_hidden()
     next_page.click();expect(page.get_by_text('Page 3 of 3',exact=True)).to_be_visible()
     expect(question).to_be_visible();assert page.locator('.sa-suggestions:visible').count()==1
     capture('after-lastpage.png')
     # Even a query matching every company is not the full-roster review.
     for query in ['Sample','Company 23','no matching fictional company']:
      search.fill(query);expect(question).to_be_hidden()
      if query=='Sample':
       last_page();expect(question).to_be_hidden()
      if query.startswith('no matching'):
       expect(page.get_by_text('No companies match your search. Try a different company or contact name.')).to_be_visible()
      search.fill('');expect(page.get_by_text('Page 1 of 3',exact=True)).to_be_visible();expect(question).to_be_hidden()
     last_page();expect(question).to_be_visible()
     # A navigation flush waits for the in-flight suggestion and latest draft.
     held=[];payloads=[]
     def hold(route):
      if route.request.method=='POST' and not payloads:
       payloads.append(json.loads(route.request.post_data));held.append(route)
      else:route.continue_()
     page.route('**/api/sa-sponsorship/review',hold)
     suggestions.fill('Sample first pending suggestion')
     expect(question.get_by_role('status')).to_contain_text('Saving…')
     suggestions.fill('Sample latest suggestion before leaving')
     previous.click()
     expect(page.get_by_text('Saving changes before moving on…',exact=False)).to_be_visible()
     expect(page.get_by_text('Page 3 of 3',exact=True)).to_be_visible()
     held[0].continue_()
     expect(page.get_by_text('Page 2 of 3',exact=True)).to_be_visible();expect(question).to_be_hidden()
     page.unroute('**/api/sa-sponsorship/review',hold)
     next_page.click();expect(suggestions).to_have_value('Sample latest suggestion before leaving')
     expect(question.get_by_role('status')).to_contain_text('Suggestions saved · revision 2')
     # Lost acknowledgement retains the draft/retry and blocks leaving.
     attempts=[];failing=[True]
     def lose_ack(route):
      if route.request.method!='POST':route.continue_();return
      attempts.append(json.loads(route.request.post_data))
      if failing[0]:
       if len(attempts)==1:assert route.fetch().status==200
       route.abort('failed')
      else:route.continue_()
     page.route('**/api/sa-sponsorship/review',lose_ack)
     suggestions.fill('Sample suggestion with lost acknowledgement');previous.click()
     expect(question.get_by_role('button',name='Retry saving')).to_be_visible()
     expect(page.get_by_text('Page 3 of 3',exact=True)).to_be_visible()
     expect(suggestions).to_have_value('Sample suggestion with lost acknowledgement')
     failing[0]=False;question.get_by_role('button',name='Retry saving').click()
     expect(question.get_by_role('status')).to_contain_text('Suggestions saved · revision 3')
     assert attempts[0]==attempts[1]
     page.unroute('**/api/sa-sponsorship/review',lose_ack)
     previous.click();expect(question).to_be_hidden();next_page.click()
     expect(suggestions).to_have_value('Sample suggestion with lost acknowledgement')
     page.reload(wait_until='networkidle');expect(question).to_be_hidden()
     last_page();expect(suggestions).to_have_value('Sample suggestion with lost acknowledgement')
     assert question.count()==1 and suggestions.count()==1
     page.set_viewport_size({'width':390,'height':844});question.scroll_into_view_if_needed()
     question.screenshot(path=str(out/'after-lastpage-mobile.png'))
     assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
     exported=req.get(endpoint+'admin',headers={'Authorization':'Bearer '+cron}).json()
     assert exported['prospects']==fixture['prospects']
     finals=[r for r in exported['responses'] if r['prospectId']=='other-companies']
     assert len(finals)==3 and all(r['choiceVersion']=='suggestions-v1' and r['choice']=='' for r in finals)
     assert not external,external
     (out/'final-question-browser.txt').write_text('PASS: full roster page1/middle hidden; lastpage exactly once; matching-all/narrow/zero-result search hidden; clear resets page1; mounted draft and held-save navigation drain; lost-ack exact retry and blocked navigation; previous/next/reload resume; unchanged canonical export; mobile no overflow; fixture data only.\n')
    print((out/'final-question-browser.txt').read_text())
    context.close();browser.close();raise SystemExit(0)
   page.screenshot(path=str(out/('before-desktop.png' if before else 'after-desktop.png')),full_page=False)
   if before:
    expect(articles.first.get_by_role('heading',name='Giving & application',exact=True)).to_be_visible()
    assert 'Skip any companies' not in page.inner_text('body')
   else:
    # Display order is alphabetical, including DOM order, without mutating canonical export.
    names=articles.locator('h2').all_inner_texts()
    assert names==sorted(names,key=str.casefold),names
    assert 'Skip any companies you do not know' in page.inner_text('body')
    assert 'All answers optional' in page.inner_text('body')
    first=articles.first
    details=first.locator('details.sa-giving')
    assert not details.evaluate('(e)=>e.open')
    expect(first.get_by_text('Fictional demonstration only',exact=True)).to_be_hidden()
    details.locator('summary').focus();page.keyboard.press('Enter')
    expect(first.get_by_text('Fictional demonstration only',exact=True)).to_be_visible()
    first.screenshot(path=str(out/'after-giving-expanded.png'))
    details.locator('summary').click()
    for label in ['A = Fully comfortable making the ask to this prospect directly',
                  'B = Comfortable with you using my name in making the ask, and will make a follow-up call after you send the pitch',
                  'C = Not comfortable making an ask, but I know the prospect and am fine with you mentioning my name in the pitch']:
     expect(first.get_by_label(label,exact=True)).to_be_visible()
    # Existing open-page legacy D still accepted; resume explains original meaning, not new D.
    import uuid
    legacy={'operationId':str(uuid.uuid4()),'rosterVersion':fixture['version'],'prospectId':fixture['prospects'][0]['id'],'revision':1,'choice':'D','comment':'Old original wording'}
    assert req.post(endpoint+'review',data=legacy,headers={'Origin':base}).status==200
    page.reload(wait_until='networkidle')
    page.get_by_label('Find a company or contact').fill(fixture['prospects'][0]['organization'])
    old=page.locator('.sa-prospect:visible')
    expect(old.get_by_text('Previously saved answer (original wording):',exact=False)).to_be_visible()
    assert "Don't know this prospect" in old.inner_text()
    assert old.locator('input[type=radio]:checked').count()==0
    old.get_by_role('textbox').fill('Legacy comment edited only')
    expect(old.get_by_role('status')).to_contain_text('revision 2')
    legacy_history=req.get(endpoint+'review').json()['responses']
    assert 'choiceVersion' not in max(legacy_history,key=lambda r:r['revision'])
    old.screenshot(path=str(out/'after-legacy-answer.png'))
    old.get_by_label('A = Fully comfortable making the ask to this prospect directly',exact=True).check()
    expect(old.get_by_role('status')).to_contain_text('revision 3')
    assert max(req.get(endpoint+'review').json()['responses'],key=lambda r:r['revision'])['choiceVersion']=='kirk-v1'
    old.get_by_role('button',name='Clear selection / skip this company').click()
    expect(old.get_by_role('status')).to_contain_text('revision 4')
    page.get_by_label('Find a company or contact').fill('')
    page.get_by_role('button',name='Next →').click()
    suggestions=page.get_by_label('Other company suggestions (optional)')
    suggestions.fill('Company: Sample Local Business; Contact: optional; Relationship: friend; How help: introduction')
    expect(page.locator('.sa-suggestions [role=status]')).to_contain_text('revision 1')
    page.reload(wait_until='networkidle')
    page.get_by_role('button',name='Next →').click()
    expect(suggestions).to_have_value('Company: Sample Local Business; Contact: optional; Relationship: friend; How help: introduction')
    page.locator('.sa-suggestions').screenshot(path=str(out/'after-other-companies.png'))
    suggestions.fill('')
    expect(page.locator('.sa-suggestions [role=status]')).to_contain_text('Suggestions cleared · revision 2')
    exported=req.get(endpoint+'admin',headers={'Authorization':'Bearer '+cron}).json()
    assert exported['prospects']==fixture['prospects'],'canonical fields and order unchanged'
    finals=[r for r in exported['responses'] if r['prospectId']=='other-companies']
    assert len(finals)==2 and finals[0]['choiceVersion']=='suggestions-v1'
    assert finals[-1]['comment']==''
    stranger=browser.new_context(ignore_https_errors=True,extra_http_headers={'x-forwarded-proto':'https'})
    assert stranger.request.get(endpoint+'review').status==401
    stranger.close()
   page.get_by_label('Find a company or contact').fill('Sample Desert Community Bank')
   first=page.locator('.sa-prospect:visible')
   page.add_style_tag(content='nextjs-portal{display:none!important}')
   first.screenshot(path=str(out/('before-company.png' if before else 'after-company.png')))
   page.set_viewport_size({'width':390,'height':844})
   first.screenshot(path=str(out/('before-mobile.png' if before else 'after-mobile.png')))
   assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
   context.close();browser.close()
  (out/'rendered-tests.txt').write_text('BEFORE captured: side-by-side giving, original responses, no final question.\n' if before else 'PASS: actual local Next HTTPS + Chromium login, alphabetic DOM/display order, collapsed native accordion keyboard toggle retaining giving, exact A/B/C wording, legacy D original meaning retained with unselected new radios, notes edit no relabel, explicit new answer version, clear/skip, final suggestion debounce+resume+clear+private export, unchanged canonical roster, auth isolation and desktop/mobile no overflow.\n')
  print((out/'rendered-tests.txt').read_text())
 finally:
  server.terminate()
  try:server.wait(timeout=15)
  except subprocess.TimeoutExpired:server.kill();server.wait()
  log.close()
