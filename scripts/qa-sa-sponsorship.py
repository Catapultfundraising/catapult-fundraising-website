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
fixture['prospects'][0]['organization']='Sample A Desert Community Bank'
# Exercise multi-line dialing vs non-dialable annotated office provenance.
fixture['prospects'][0]['directPhone']='+1 (202) 555-0104; +1 (202) 555-0105'
fixture['prospects'][0]['officePhone']='+1 (202) 555-0100 (original file; not reverified)'
if source_only:
 fixture['prospects'][1]['officePhone']='+1 (202) 555-0110 ext. 42 (company record)'
 fixture['prospects'][2]['officePhone']='+1 (202) 555-0120 (published office line)'
 fixture['prospects'][2]['contactFit']='Public-source contact; see role'
if filter_only:
 template=fixture['prospects'][0]
 fixture['prospects']=[{**template,'id':f'sample-{i+1}','organization':'Sample A Desert Community Bank' if i==0 else f'Sample Community Company {i+1}','contactName':'' if i<20 or i==21 else 'Sample Contact','email':'work@example.com' if i in [20,21,23,26] else '','directPhone':'+1 202-555-0100' if i in [20,21,22,26] else '','officePhone':'(202) 555-0100 (original file; not reverified)' if i in [23,24] else '','portals':[{**template['portals'][0],'email':'shared@example.com'}] if i==25 else []} for i in range(27)]
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
   first=page.get_by_role('article').filter(has=page.get_by_role('heading',name='Sample A Desert Community Bank'))
   expect(first).to_be_visible(timeout=10000)
   if source_only:
    if source_before:
     first.get_by_text('Contact research notes',exact=True).click()
     expect(first.get_by_text('Source: Fictional test fixture — not a researched contact',exact=True)).to_be_visible()
     expect(first.get_by_text('Checked 2026-11-23 · Source: Fictional example-domain source',exact=True)).to_be_visible()
    else:
     assert first.locator('details.sa-giving').count()==1
     first.locator('details.sa-giving summary').click()
     for absent in ['Source:', 'Contact research notes', 'Fictional test fixture', 'Fictional example-domain source', 'original file']:
      assert absent not in first.inner_text(),absent
     expect(first.get_by_text('not reverified',exact=False)).to_be_visible()
     second=page.get_by_role('article').filter(has=page.get_by_role('heading',name='Sample Community Company 2',exact=True))
     third=page.get_by_role('article').filter(has=page.get_by_role('heading',name='Sample Community Company 3',exact=True))
     expect(second.get_by_text('+1 (202) 555-0110 ext. 42',exact=True)).to_be_visible()
     expect(third.locator('a[href="tel:+12025550120"]')).to_be_visible()
     expect(third.get_by_text('Published contact; see role',exact=True)).to_be_visible()
     assert 'company record' not in second.inner_text() and 'published office line' not in third.inner_text()
     expect(first.get_by_text('Contact fit',exact=True)).to_be_visible()
     expect(first.get_by_text('Sample contact for preview only',exact=True)).to_be_visible()
     expect(first.get_by_role('link',name='Visit company website')).to_have_attribute('href','https://example.com')
     expect(first.get_by_role('link',name='Giving / ask / application link')).to_have_attribute('href','https://example.com/giving')
     expect(first.locator('a[href="mailto:jordan@example.com"]')).to_be_visible()
     expect(first.locator('a[href="mailto:giving@example.com"]')).to_be_visible()
     assert first.locator('a[href^="tel:"]').count()>=2
     expect(first.get_by_text('Fictional work email for testing only',exact=True)).to_be_visible()
     expect(first.get_by_text('Fictional direct / mobile line',exact=True)).to_be_visible()
     expect(first.get_by_text('Eligibility not verified',exact=True)).to_be_visible()
     expect(first.get_by_text('Fictional demonstration only',exact=True)).to_be_visible()
     expect(first.get_by_text('No confirmed application timing',exact=False)).to_be_visible()
    first.screenshot(path=str(out/('before-desktop.png' if source_before else 'after-desktop.png')))
    page.set_viewport_size({'width':390,'height':844})
    first.screenshot(path=str(out/('before-mobile.png' if source_before else 'after-mobile.png')))
    assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
    exported=req.get(endpoint+'admin',headers={'Authorization':'Bearer '+cron}).json()
    assert exported['prospects']==fixture['prospects'],'canonical admin fields unchanged'
    assert exported['responses']==[] and len(exported['members'])==1
    (out/'source-display-browser.txt').write_text(('BEFORE: research notes and portal citations visible.' if source_before else 'PASS: no source/research notes/citations or office provenance; contact qualifications, mailto/tel, company/giving links, eligibility/status/timing retained; desktop/mobile no overflow; full admin roster unchanged; no response writes.')+'\n')
    print((out/'source-display-browser.txt').read_text())
    context.close();browser.close();raise SystemExit(0)
   if filter_only:
    expect(page.get_by_text('0 companies with saved input · All answers optional',exact=True)).to_be_visible()
    assert first.get_by_text('Not available / not verified',exact=True).count()>0,'contact-less Top20 exception retained'
    # Record an old-open-page answer for an excluded canonical prospect: stays in
    # admin history, never in current member response counts or roster.
    old=req.post(endpoint+'review',data={'operationId':__import__('uuid').uuid4().__str__(),'rosterVersion':fixture['version'],'prospectId':'sample-24','revision':1,'choice':'C','comment':'Sample prior open-page edit'},headers={'Origin':base})
    assert old.status==200,old.text()
    member_view=req.get(endpoint+'review').json()
    assert len(member_view['roster']['prospects'])==22 and member_view['responses']==[]
    assert not any(p['id'] in ['sample-22','sample-23','sample-24','sample-25','sample-26'] for p in member_view['roster']['prospects'])
    exported=req.get(endpoint+'admin',headers={'Authorization':'Bearer '+cron}).json()
    assert len(exported['prospects'])==27 and len(exported['responses'])==1
    page.get_by_role('button',name='Next →').click();expect(page.get_by_text('Page 2 of 3',exact=True)).to_be_visible()
    page.get_by_role('button',name='Next →').click();expect(page.get_by_text('Page 3 of 3',exact=True)).to_be_visible()
    expect(page.get_by_role('heading',name='Sample Community Company 8',exact=True)).to_be_visible()
    expect(page.get_by_role('heading',name='Sample Community Company 9',exact=True)).to_be_visible()
    assert page.get_by_role('heading',name='Sample Community Company 23',exact=True).count()==0
    page.wait_for_function('window.scrollY===0')
    page.get_by_label('Find a company or contact').fill('Company 23')
    expect(page.get_by_text('No companies match your search. Try a different company or contact name.',exact=True)).to_be_visible()
    page.get_by_label('Find a company or contact').fill('')
    expect(page.get_by_text('0 companies with saved input · All answers optional',exact=True)).to_be_visible()
    (out/'member-filter-browser.txt').write_text('PASS: strict member filter22/27 with20 contact-less Top20 exceptions; only complete named/main-email/direct profiles included; missing-name/email/direct and office/shared-only rows absent from browser;22-count/3-page pagination/search; excluded old-page save retained in full27 admin export/history and omitted from member responses.\n')
    print((out/'member-filter-browser.txt').read_text())
    context.close();browser.close();raise SystemExit(0)
   assert len(first.locator('a[href^="tel:"]').all())==2,'semicolon direct numbers each get one link; uncertain office remains text with its warning'
   expect(first.get_by_text('A = Fully comfortable making the ask to this prospect directly',exact=True)).to_be_visible()
   page.screenshot(path=str(out/'desktop-review.png'),full_page=False)
   first.screenshot(path=str(out/'desktop-company.png'))
   # Immediate role autosave, debounced notes, no routine Save action.
   assert first.get_by_role('button',name='Save this company').count()==0
   first.get_by_role('radio').nth(2).check()
   expect(first.get_by_role('status')).to_contain_text('Saved · revision 1')
   comment=first.get_by_label('Comment (optional)')
   comment.fill('Sample connection — automatically saved.')
   expect(first.get_by_role('status')).to_contain_text('Saved · revision 2')
   assert comment.evaluate('(el)=>document.activeElement===el'),'typing focus retained after save'
   page.reload(wait_until='networkidle');expect(first.get_by_role('radio').nth(2)).to_be_checked()
   expect(first.get_by_label('Comment (optional)')).to_have_value('Sample connection — automatically saved.')
   # Hold one in-flight response: controls remain editable; latest edits coalesce.
   held=[];held_payloads=[]
   def hold_first(route):
    if route.request.method=='POST' and not held_payloads:
     held_payloads.append(json.loads(route.request.post_data));held.append(route)
    else:route.continue_()
   page.route('**/api/sa-sponsorship/review',hold_first)
   first.get_by_role('radio').nth(0).check()
   expect(first.get_by_role('status')).to_contain_text('Saving…')
   comment=first.get_by_label('Comment (optional)');comment.fill('Sample typed while request is pending')
   expect(comment).to_be_enabled();assert comment.evaluate('(el)=>document.activeElement===el')
   first.get_by_role('radio').nth(1).check()
   held[0].continue_()
   expect(first.get_by_role('status')).to_contain_text('Saved · revision 4')
   expect(comment).to_have_value('Sample typed while request is pending')
   page.unroute('**/api/sa-sponsorship/review',hold_first)
   # Actual lost acknowledgement: server commits, browser sees failure. Navigation
   # must stay on page until exact retry and any newer edits are acknowledged.
   failed=[];fail_transport=[True]
   def lose_ack(route):
    if route.request.method!='POST':route.continue_();return
    payload=json.loads(route.request.post_data);failed.append(payload)
    if fail_transport[0]:
     if len(failed)==1:assert route.fetch().status==200
     route.abort('failed')
    else:route.continue_()
   page.route('**/api/sa-sponsorship/review',lose_ack)
   comment.fill('Sample pending acknowledged-on-server note')
   page.get_by_role('button',name='Next →').click()
   expect(first.get_by_role('button',name='Retry saving')).to_be_visible()
   expect(first).to_be_visible();expect(page.get_by_text('Page 1 of 2',exact=True)).to_be_visible()
   # Search cannot hide unconfirmed edits either; query waits, not the typed note.
   page.get_by_label('Find a company or contact').fill('Company 9')
   expect(first).to_be_visible();expect(page.get_by_text('Sample Community Company 9',exact=True)).not_to_be_visible()
   comment.fill('Sample newest text preserved after failure')
   expect(comment).to_be_enabled();expect(comment).to_have_value('Sample newest text preserved after failure')
   assert page.evaluate("(()=>{const e=new Event('beforeunload',{cancelable:true});window.dispatchEvent(e);return e.defaultPrevented;})()"),'page-close warning active with unsaved edits'
   fail_transport[0]=False
   first.get_by_role('button',name='Retry saving').click()
   expect(first.get_by_role('status')).to_contain_text('Saved · revision 6')
   assert failed[0]==failed[1],'ambiguous retry keeps exact UUID/revision/body'
   assert failed[-1]['comment']=='Sample newest text preserved after failure'
   expect(comment).to_have_value('Sample newest text preserved after failure')
   page.unroute('**/api/sa-sponsorship/review',lose_ack)
   page.get_by_label('Find a company or contact').fill('')
   # Notes-only autosave and clear without inferred role or Reviewed count.
   second_card=page.get_by_role('article').filter(has=page.get_by_role('heading',name='Sample Community Company 2',exact=True))
   note=second_card.get_by_label('Comment (optional)');note.fill('Sample notes only, no role selected')
   expect(second_card.get_by_role('status')).to_contain_text('Notes saved · no role selected · revision 1')
   expect(second_card.get_by_text('Notes saved',exact=True)).to_be_visible()
   assert second_card.get_by_role('radio',checked=True).count()==0
   expect(page.get_by_text('2 companies with saved input · All answers optional',exact=True)).to_be_visible()
   note.fill('');page.get_by_label('Find a company or contact').focus()
   expect(second_card.get_by_role('status')).to_contain_text('Notes cleared · no role selected · revision 2')
   note.fill('Sample final notes flushed before filter')
   page.get_by_label('Find a company or contact').fill('Company 9')
   expect(page.get_by_role('heading',name='Sample Community Company 9',exact=True)).to_be_visible()
   exported=req.get(endpoint+'admin',headers={'Authorization':'Bearer '+cron}).json()
   note_history=[r for r in exported['responses'] if r['prospectId']=='sample-2']
   assert note_history[-1]['choice']=='' and note_history[-1]['comment']=='Sample final notes flushed before filter'
   page.get_by_label('Find a company or contact').fill('')
   page.get_by_role('button',name='Next →').click()
   expect(page.get_by_text('Page 2 of 2',exact=True)).to_be_visible();page.wait_for_function('window.scrollY===0')
   page.get_by_role('button',name='← Previous').click()
   expect(first).to_be_visible();page.wait_for_function('window.scrollY===0')
   # Focused save-area screenshots only; no roster or layout redesign.
   page.add_style_tag(content='nextjs-portal{display:none!important}')
   first.locator('.sa-answer').screenshot(path=str(out/'desktop-autosave.png'))
   page.set_viewport_size({'width':390,'height':844})
   first.locator('.sa-answer').screenshot(path=str(out/'mobile-autosave.png'))
   assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'),'no mobile horizontal overflow'
   assert not external,external
   # New login same email is a fresh member, never an email-only account lookup.
   other=browser.new_context(ignore_https_errors=True,extra_http_headers={'x-forwarded-proto':'https'})
   login=other.request.post(endpoint+'session',data={'name':'Sample Board Member','email':'member@example.com','code':code},headers={'Origin':'https://localhost:3133'});assert login.status==200,login.text()
   isolated=other.request.get(endpoint+'review');assert isolated.status==200;assert isolated.json()['responses']==[]
   exported=req.get(endpoint+'admin',headers={'Authorization':'Bearer '+cron});assert exported.status==200;assert len(exported.json()['responses'])==9
   # End-session clears capability without deleting append-only receipts.
   assert other.request.delete(endpoint+'session',headers={'Origin':'https://localhost:3133'}).status==200
   assert other.request.get(endpoint+'review').status==401
   # Session end flushes note-only edits before deleting the capability.
   note.fill('Sample note flushed on end session')
   page.get_by_role('button',name='End this browser session').click()
   expect(page.get_by_role('heading',name='Board member access')).to_be_visible()
   after_logout=req.get(endpoint+'admin',headers={'Authorization':'Bearer '+cron}).json()
   assert any(r['choice']=='' and r['comment']=='Sample note flushed on end session' for r in after_logout['responses'])
   other.close();context.close();browser.close()
  (out/'rendered-tests.txt').write_text('PASS: actual Next + Chromium desktop/mobile access, no private contacts in HTML, no third-party tracking with prior consent, secure session, role/notes-only autosave,600ms debounce, editable pending saves, exact ambiguous retry, blocked error navigation/search, scroll-top pagination, note clear/resume, session-end flush, no overflow, isolation and export.\n')
  print((out/'rendered-tests.txt').read_text())
 finally:
  server.terminate()
  try:server.wait(timeout=15)
  except subprocess.TimeoutExpired:server.kill();server.wait()
  log.close()
