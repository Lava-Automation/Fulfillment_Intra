import { useState, useEffect, useMemo } from "react";
import { logActivity } from "../../lib/activity";

// ─────────────────────────────────────────────
//  THEME TOKENS
// ─────────────────────────────────────────────
const T = {
  bg:"#F0EDE8", surface:"#FAFAF8", surface2:"#EEEBE5",
  border:"#D8D4CC", border2:"#C8C4BB",
  ink:"#1A1916", ink2:"#5A5750", ink3:"#8A8780",
  lava:"#D93A0C", lava2:"#F05A28",
  green:"#1D7A4F", greenBg:"#E8F5EE",
  yellow:"#B07D10", yellowBg:"#FDF5E0",
  red:"#C02020", redBg:"#FDEAEA",
  blue:"#1A5FAA", blueBg:"#E8F0FA",
};

// ─────────────────────────────────────────────
//  DATA
// ─────────────────────────────────────────────
const KANBAN_COLS = ['Onboarding','QAQC','Training','Support','Monthly','Quarterly','Ad-Hoc','Cancelled'];
const STAGE_COLORS = {
  Onboarding: T.blue, QAQC:'#9A4FCC', Training: T.green, Support: T.red,
  Monthly: T.yellow, Quarterly: T.lava, 'Ad-Hoc':'#8A7060', Cancelled: T.ink3,
};

const ACCOUNTS_DATA = [
  {id:'acme',       name:'Acme Corp',         pm:'Darek C.',    fulfillment:'Active', csStatus:'Healthy',  pct:68, tix:1, since:'Jan 2026', stage:'Training'},
  {id:'technova',   name:'TechNova Inc',      pm:'Sam R.',      fulfillment:'Active', csStatus:'At Risk',  pct:41, tix:2, since:'Feb 2026', stage:'Support'},
  {id:'meridian',   name:'Meridian Group',    pm:'Victoria S.', fulfillment:'Active', csStatus:'Healthy',  pct:82, tix:1, since:'Nov 2025', stage:'Quarterly'},
  {id:'skyline',    name:'Skyline Ventures',  pm:'Sam R.',      fulfillment:'Active', csStatus:'Healthy',  pct:45, tix:1, since:'Mar 2026', stage:'QAQC'},
  {id:'blueridge',  name:'Blueridge Digital', pm:'Darek C.',    fulfillment:'Active', csStatus:'At Risk',  pct:61, tix:1, since:'Dec 2025', stage:'Monthly'},
  {id:'coral',      name:'Coral Dynamics',    pm:'Darek C.',    fulfillment:'Active', csStatus:'New',      pct:12, tix:0, since:'May 2026', stage:'Onboarding'},
  {id:'pinnacle',   name:'Pinnacle Insurance',pm:'Victoria S.', fulfillment:'Active', csStatus:'Healthy',  pct:74, tix:0, since:'Oct 2025', stage:'Monthly'},
  {id:'greenpath',  name:'GreenPath Agency',  pm:'Sam R.',      fulfillment:'Active', csStatus:'Healthy',  pct:55, tix:1, since:'Jan 2026', stage:'QAQC'},
  {id:'hartwell',   name:'Hartwell & Sons',   pm:'Darek C.',    fulfillment:'Paused', csStatus:'At Risk',  pct:33, tix:2, since:'Apr 2026', stage:'Support'},
  {id:'nexaflow',   name:'NexaFlow Partners', pm:'Victoria S.', fulfillment:'Active', csStatus:'Healthy',  pct:90, tix:0, since:'Aug 2025', stage:'Ad-Hoc'},
  {id:'brightside', name:'Brightside Group',  pm:'Sam R.',      fulfillment:'Active', csStatus:'New',      pct:8,  tix:0, since:'May 2026', stage:'Onboarding'},
  {id:'crestview',  name:'Crestview Advisors',pm:'Victoria S.', fulfillment:'Active', csStatus:'Healthy',  pct:62, tix:1, since:'Feb 2026', stage:'Quarterly'},
];

const ACCT_DETAIL = {
  acme: {
    profile: {
      agencyName:'Acme Corp', location:'Austin, TX', phone:'(512) 834-1100',
      startDate:'January 10, 2026', onboardingDate:'January 15, 2026', trainingDate:'February 3, 2026', goLiveDate:'March 1, 2026',
      plan:'Growth Plan — $2,500/mo', fulfillment:'Active', csStatus:'Healthy', cancelDate:null,
      crm:'HubSpot', ams:'AgencyZoom', website:'https://www.acmecorp.com', googleReview:'https://g.page/acmecorp/review',
      techList:['HubSpot CRM','Slack','Zapier','Google Workspace','Stripe'], openTickets:1,
    },
    contacts: {
      va:{name:'Marcus Rivera',agencyEmail:'marcus@acmecorp.com',lavaEmail:'marcus@lavaautomation.com',av:'MR',bg:'#8B4513'},
      lava:[
        {role:'Sales Rep',name:'Jordan Cole',email:'jordan@lavaautomation.com',scheduler:'https://calendly.com/jordan-lava',av:'JC',bg:'#D93A0C'},
        {role:'Account Manager',name:'Lisa Grant',email:'lisa@lavaautomation.com',scheduler:'https://calendly.com/lisa-lava',av:'LG',bg:'#6A3A9A'},
        {role:'Project Manager',name:'Darek C.',email:'darekc@lavaautomation.com',scheduler:'https://calendly.com/darekc-lava',av:'DC',bg:'#D93A0C'},
        {role:'Dev Support',name:'Dev Team',email:'dev@lavaautomation.com',scheduler:null,av:'DT',bg:'#1A5FAA'},
      ],
      agency:[
        {role:'Agency Owner',name:'Daniel Hurst',email:'daniel@acmecorp.com',av:'DH',bg:'#8B4513'},
        {role:'Agency Contact',name:'Jane Smith',email:'jane@acmecorp.com',av:'JS',bg:'#1A5FAA'},
      ],
    },
    tickets:{
      open:[{id:'TKT-0039',title:'Slack notification not triggering for deal closures',severity:'Low',date:'May 26, 2026',category:'Technical / Bug'}],
      closed:[
        {id:'TKT-0037',title:'HubSpot field mapping incorrect for phone numbers',severity:'Medium',date:'May 23, 2026',resolved:'May 23, 2026',category:'Technical / Bug'},
        {id:'TKT-0031',title:'Email sequence not firing after lead assignment',severity:'High',date:'Apr 10, 2026',resolved:'Apr 11, 2026',category:'Technical / Bug'},
      ],
    },
    meetings:{
      scheduled:[{type:'Phase Review',date:'Jun 3, 2026',time:'2:00 PM CST',attendees:'Jane Smith, Darek C.',notes:'Phase 3 status + Phase 4 preview'}],
      previous:[
        {type:'Weekly Check-In',date:'May 22, 2026',time:'10:00 AM CST',attendees:'Jane Smith, Darek C.',notes:'Discussed Slack webhook issue, ETA May 30.'},
        {type:'Phase 2 Kickoff',date:'Feb 10, 2026',time:'11:00 AM CST',attendees:'Daniel Hurst, Jane Smith, Darek C.',notes:'Kicked off data pipeline phase.'},
      ],
    },
    meetingContacts:[
      {role:'Agency Owner',name:'Daniel Hurst',days:112},{role:'Project Manager',name:'Darek C.',days:7},
      {role:'Account Manager',name:'Lisa Grant',days:23},{role:'VA Lead',name:'Marcus Rivera',days:3},
    ],
    meetingRecs:[
      {type:'trend',text:'Lead response time has been slipping in afternoon windows. Consider adding VA coverage to the second shift.'},
      {type:'idea',text:'Three manual intake steps identified in Phase 2 that automation can absorb. Scope this in the Phase 4 review.'},
      {type:'warn',text:'Slack webhook issue is now 3 days old with no client update sent. Send a status note before the Jun 3 meeting.'},
    ],
    meetingAsks:[
      {label:'Asked for a testimonial',days:23},{label:'Asked for a referral',days:37},
      {label:'Pitched a cross-sell',days:80},{label:'Offered more VA or automation help',days:9},
      {label:'Asked if they know an agency that needs us',days:'not yet'},
    ],
    notes:{
      sales:[
        {date:'May 29, 2026',author:'Jordan Cole',text:'Following up on expansion conversation — Daniel mentioned interest in adding 2 more VAs. Circle back after Phase 3 completes.'},
        {date:'Mar 10, 2026',author:'Jordan Cole',text:'Upsell conversation initiated. Client happy with Growth Plan but open to discussing Enterprise benefits. Will revisit Q3.'},
        {date:'Jan 5, 2026',author:'Jordan Cole',text:'Inbound lead via website — owner Daniel Hurst reached out Jan 5. Closed on Growth Plan after a 7-day trial.'},
      ],
      am:[
        {date:'May 22, 2026',author:'Lisa Grant',text:'Account health strong. Jane is highly engaged. Main concern is lead response time hovering above target.'},
        {date:'Apr 1, 2026',author:'Lisa Grant',text:'QBR prep underway. Client satisfaction scores high.'},
        {date:'Feb 15, 2026',author:'Lisa Grant',text:'Onboarding fully complete. Weekly check-ins scheduled with Jane Smith.'},
      ],
      pm:[
        {date:'May 29, 2026',author:'Darek C.',text:'Phase 2 complete as of Apr 25. Phase 3 kicked off May 1. Trigger mapping done. Lead routing still in progress.'},
        {date:'Apr 25, 2026',author:'Darek C.',text:'Phase 2 signed off today. All data pipeline deliverables passed QA.'},
        {date:'Feb 10, 2026',author:'Darek C.',text:'Phase 2 kickoff meeting held. All stakeholders aligned on scope.'},
      ],
      dev:[
        {date:'May 22, 2026',author:'Dev Team',text:'HubSpot OAuth token refresh resolved Apr 20. Slack webhook credential rotation needed by May 1 — flagged to client.'},
        {date:'Apr 20, 2026',author:'Dev Team',text:'OAuth token refresh issue root-caused to expired refresh token in HubSpot app. Rotated credentials.'},
        {date:'Mar 5, 2026',author:'Dev Team',text:'Initial CRM field mapping review complete. 3 custom fields added to HubSpot.'},
      ],
    },
    timeline:[
      {date:'May 29, 2026',label:'Ticket Opened',detail:'#TKT-0039 — Slack notification not triggering',color:'r'},
      {date:'May 22, 2026',label:'Meeting Held',detail:'Weekly Check-In with Jane Smith',color:'b'},
      {date:'May 1, 2026',label:'Phase 3 Kicked Off',detail:'Workflow Automation phase started',color:'la'},
      {date:'Apr 25, 2026',label:'Phase 2 Complete',detail:'Data pipeline signed off — all QA passed',color:'g'},
      {date:'Jan 10, 2026',label:'Account Created',detail:'Acme Corp onboarded on Growth Plan',color:'la'},
    ],
  },
  technova: {
    profile:{agencyName:'TechNova Inc',location:'Dallas, TX',phone:'(737) 210-4400',startDate:'February 14, 2026',onboardingDate:'February 18, 2026',trainingDate:'March 10, 2026',goLiveDate:null,plan:'Starter Plan — $1,500/mo',fulfillment:'Active',csStatus:'At Risk',cancelDate:null,crm:'Salesforce',ams:'Hawksoft',website:'https://www.technovainc.com',googleReview:'https://g.page/technovainc/review',techList:['Salesforce','Hawksoft','Make (Integromat)','Slack'],openTickets:2},
    contacts:{va:{name:'Tyler James',agencyEmail:'tyler@technova.com',lavaEmail:'tyler@lavaautomation.com',av:'TJ',bg:'#1D7A4F'},lava:[{role:'Sales Rep',name:'Jordan Cole',email:'jordan@lavaautomation.com',scheduler:'https://calendly.com/jordan-lava',av:'JC',bg:'#D93A0C'},{role:'Account Manager',name:'Omar Fields',email:'omar@lavaautomation.com',scheduler:'https://calendly.com/omar-lava',av:'OF',bg:'#6A3A9A'},{role:'Project Manager',name:'Sam R.',email:'samr@lavaautomation.com',scheduler:'https://calendly.com/samr-lava',av:'SR',bg:'#D93A0C'},{role:'Dev Support',name:'Dev Team',email:'dev@lavaautomation.com',scheduler:null,av:'DT',bg:'#1A5FAA'}],agency:[{role:'Agency Owner',name:'Rick Torres',email:'rick@technova.com',av:'RT',bg:'#1A5FAA'},{role:'Agency Contact',name:'Paula Nguyen',email:'paula@technova.com',av:'PN',bg:'#2A7A4F'}]},
    tickets:{open:[{id:'TKT-0042',title:'Automation triggers not firing on new lead creation',severity:'High',date:'May 29, 2026',category:'Technical / Bug'},{id:'TKT-0040',title:'CRM sync duplicating contact records on import',severity:'High',date:'May 27, 2026',category:'Technical / Bug'}],closed:[{id:'TKT-0034',title:'Salesforce field permissions blocking write access',severity:'Medium',date:'Apr 28, 2026',resolved:'Apr 30, 2026',category:'Technical / Bug'}]},
    meetings:{scheduled:[{type:'Issue Escalation',date:'May 31, 2026',time:'10:00 AM CST',attendees:'Rick Torres, Sam R.',notes:'Automation trigger failures blocking sales pipeline.'}],previous:[{type:'Weekly Check-In',date:'May 15, 2026',time:'10:00 AM CST',attendees:'Paula Nguyen, Sam R.',notes:'Reviewed Phase 2 milestones. CRM data sync at 80%.'}]},
    meetingContacts:[{role:'Agency Owner',name:'Rick Torres',days:14},{role:'Project Manager',name:'Sam R.',days:5},{role:'Account Manager',name:'Omar Fields',days:31},{role:'VA',name:'Tyler James',days:2}],
    meetingRecs:[{type:'warn',text:'Two high-severity tickets open with no resolution ETA shared to client. Send a dev update before the escalation call.'},{type:'idea',text:'Salesforce API rate limits are a recurring issue — flag this for a permanent fix.'},{type:'trend',text:'Account is At Risk. Consider scheduling a QBR-style review to realign expectations.'}],
    meetingAsks:[{label:'Asked for a testimonial',days:null},{label:'Asked for a referral',days:null},{label:'Pitched a cross-sell',days:null},{label:'Offered more VA or automation help',days:5},{label:'Asked if they know an agency that needs us',days:'not yet'}],
    notes:{sales:[{date:'May 15, 2026',author:'Jordan Cole',text:'Account flagged At Risk. Checking in with Rick Torres to maintain relationship. No churn signals yet.'},{date:'Feb 14, 2026',author:'Jordan Cole',text:'Outbound close — contacted via LinkedIn. Rick Torres decision maker. Signed Starter Plan.'}],am:[{date:'May 29, 2026',author:'Omar Fields',text:'Account flagged At Risk due to open high-severity tickets. Escalation meeting scheduled May 31.'},{date:'May 15, 2026',author:'Omar Fields',text:'Check-in with Paula Nguyen. Frustration noted around CRM sync delays.'}],pm:[{date:'May 29, 2026',author:'Sam R.',text:'Phase 2 behind schedule due to Salesforce permission issues. CRM data sync at 85% complete.'},{date:'May 15, 2026',author:'Sam R.',text:'CRM data sync at 80%. Salesforce permissions issue escalated to dev.'}],dev:[{date:'May 29, 2026',author:'Dev Team',text:'Trigger webhook not registering — investigating Salesforce API rate limit. ETA 48–72 hrs.'},{date:'Apr 30, 2026',author:'Dev Team',text:'Salesforce field permission issue resolved. Write access restored.'}]},
    timeline:[{date:'May 29, 2026',label:'Ticket Opened',detail:'#TKT-0042 — Automation triggers not firing',color:'r'},{date:'May 27, 2026',label:'Ticket Opened',detail:'#TKT-0040 — CRM sync duplicating records',color:'r'},{date:'May 15, 2026',label:'Meeting Held',detail:'Weekly check-in with Paula Nguyen',color:'b'},{date:'Feb 14, 2026',label:'Account Created',detail:'TechNova Inc onboarded on Starter Plan',color:'la'}],
  },
  meridian: {
    profile:{agencyName:'Meridian Group',location:'Plano, TX',phone:'(469) 300-5500',startDate:'November 3, 2025',onboardingDate:'November 7, 2025',trainingDate:'December 1, 2025',goLiveDate:'January 15, 2026',plan:'Enterprise Plan — $5,000/mo',fulfillment:'Active',csStatus:'Healthy',cancelDate:null,crm:'HubSpot',ams:'Applied Epic',website:'https://www.meridiangroup.com',googleReview:'https://g.page/meridiangroup/review',techList:['HubSpot CRM','Applied Epic','Zapier','Slack','DocuSign','Google Workspace'],openTickets:1},
    contacts:{va:{name:'Sandra Kim',agencyEmail:'sandra@meridiangroup.com',lavaEmail:'sandra@lavaautomation.com',av:'SK',bg:'#1A7A7A'},lava:[{role:'Sales Rep',name:'Jordan Cole',email:'jordan@lavaautomation.com',scheduler:'https://calendly.com/jordan-lava',av:'JC',bg:'#D93A0C'},{role:'Account Manager',name:'Lisa Grant',email:'lisa@lavaautomation.com',scheduler:'https://calendly.com/lisa-lava',av:'LG',bg:'#6A3A9A'},{role:'Project Manager',name:'Victoria S.',email:'victorias@lavaautomation.com',scheduler:'https://calendly.com/victorias-lava',av:'VS',bg:'#D93A0C'},{role:'Dev Support',name:'Dev Team',email:'dev@lavaautomation.com',scheduler:null,av:'DT',bg:'#1A5FAA'}],agency:[{role:'Agency Owner',name:'Alex Warren',email:'alex@meridiangroup.com',av:'AW',bg:'#6A3A9A'},{role:'Agency Contact',name:'Claire Moss',email:'claire@meridiangroup.com',av:'CM',bg:'#1A5FAA'}]},
    tickets:{open:[{id:'TKT-0038',title:'Phase 4 VA training materials not accessible for one team member',severity:'Medium',date:'May 25, 2026',category:'Training Gap'}],closed:[{id:'TKT-0029',title:'DocuSign webhook not triggering on contract completion',severity:'Low',date:'Mar 15, 2026',resolved:'Mar 16, 2026',category:'Technical / Bug'}]},
    meetings:{scheduled:[{type:'Strategy & Planning',date:'Jun 5, 2026',time:'1:00 PM CST',attendees:'Alex Warren, Victoria S.',notes:'Q3 automation roadmap planning session.'}],previous:[{type:'Phase 3 Review',date:'May 10, 2026',time:'11:00 AM CST',attendees:'Alex Warren, Claire Moss, Victoria S.',notes:'Phase 3 complete. All automations passing QA.'},{type:'QBR',date:'Feb 1, 2026',time:'2:00 PM CST',attendees:'Alex Warren, Lisa Grant, Victoria S.',notes:'Q1 business review. Client very satisfied.'}]},
    meetingContacts:[{role:'Agency Owner',name:'Alex Warren',days:19},{role:'Project Manager',name:'Victoria S.',days:19},{role:'Account Manager',name:'Lisa Grant',days:118},{role:'VA Lead',name:'Sandra Kim',days:4}],
    meetingRecs:[{type:'trend',text:'Alex Warren has referred two leads this quarter — offer a formal referral incentive.'},{type:'idea',text:'Phase 4 VA onboarding starts June 1. Prepare a dedicated onboarding check-in meeting.'},{type:'warn',text:'Account Manager last met with this account 118 days ago. Schedule a touchpoint.'}],
    meetingAsks:[{label:'Asked for a testimonial',days:14},{label:'Asked for a referral',days:8},{label:'Pitched a cross-sell',days:45},{label:'Offered more VA or automation help',days:19},{label:'Asked if they know an agency that needs us',days:8}],
    notes:{sales:[{date:'May 20, 2026',author:'Jordan Cole',text:'Alex Warren referred two leads — sent thank-you note, flagged for referral incentive program.'},{date:'Jan 5, 2026',author:'Jordan Cole',text:'Upgrade to Enterprise confirmed. Alex cited ROI from Phase 1 automations.'},{date:'Nov 3, 2025',author:'Jordan Cole',text:'Inbound referral. Fastest close in Q4 2025 (3 days). Signed on Growth Plan.'}],am:[{date:'May 22, 2026',author:'Lisa Grant',text:'Top-performing account. Alex Warren is a strong advocate. QBR Feb 1 very positive.'},{date:'Feb 1, 2026',author:'Lisa Grant',text:'QBR completed. Client extremely satisfied. Expansion conversations ongoing.'}],pm:[{date:'May 25, 2026',author:'Victoria S.',text:'Phase 4 VA onboarding begins June 1. All automations live and stable. Sandra Kim performing exceptionally.'},{date:'May 10, 2026',author:'Victoria S.',text:'Phase 3 review complete. All automations passed QA.'},{date:'Feb 10, 2026',author:'Victoria S.',text:'Phase 2 kicked off. DocuSign and Applied Epic integrations scoped.'}],dev:[{date:'May 20, 2026',author:'Dev Team',text:'No major dev issues. Minor API latency on high-volume days — monitoring.'},{date:'Mar 16, 2026',author:'Dev Team',text:'DocuSign webhook issue resolved. Closed ticket TKT-0029.'}]},
    timeline:[{date:'May 25, 2026',label:'Ticket Opened',detail:'#TKT-0038 — VA training access issue',color:'y'},{date:'May 10, 2026',label:'Meeting Held',detail:'Phase 3 Review — all QA passed',color:'b'},{date:'May 1, 2026',label:'Phase 4 Started',detail:'VA Onboarding phase kicked off',color:'la'},{date:'Feb 1, 2026',label:'QBR Completed',detail:'Quarterly business review — client satisfied',color:'b'},{date:'Nov 3, 2025',label:'Account Created',detail:'Meridian Group onboarded on Growth Plan',color:'la'}],
  },
};

const TRAINERS = [
  {av:'KC',bg:'#D93A0C',name:'Kara Collins',title:'Senior LAVA Trainer',email:'kara@lavaautomation.com',specialty:'HubSpot · CRM Automation · Email Sequences',capacity:3,assigned:3,workload:100,vas:['marcus','sandra','aisha']},
  {av:'BT',bg:'#1A5FAA',name:'Brandon Torres',title:'LAVA Trainer',email:'brandon@lavaautomation.com',specialty:'Salesforce · Zapier · Lead Routing',capacity:4,assigned:2,workload:50,vas:['tyler','natalie']},
  {av:'YM',bg:'#1D7A4F',name:'Yvonne Mills',title:'LAVA Trainer',email:'yvonne@lavaautomation.com',specialty:'Make · Webhooks · API Integrations',capacity:4,assigned:3,workload:75,vas:['jordan','aisha','natalie']},
];

const VA_PROFILES = [
  {id:'marcus',av:'MR',bg:'#8B4513',name:'Marcus Rivera',title:'Senior VA',status:'active',account:'Acme Corp / Blueridge Digital',trainer:'Kara Collins',startDate:'Jan 12, 2026',modsDone:8,modsTotal:8,taskComp:98,tasksRun:4820,issues:[],bio:'Experienced VA managing two accounts simultaneously. Fully trained and highest-performing VA on the roster.',skills:['HubSpot','Email Automation','Lead Routing','Slack','Google Workspace']},
  {id:'sandra',av:'SK',bg:'#1A7A7A',name:'Sandra Kim',title:'VA Lead',status:'active',account:'Meridian Group',trainer:'Kara Collins',startDate:'Nov 5, 2025',modsDone:8,modsTotal:8,taskComp:100,tasksRun:6320,issues:[],bio:"Top-performing VA Lead managing LAVA's highest-volume account. Strong HubSpot expertise.",skills:['HubSpot','Applied Epic','DocuSign','Zapier','Reporting']},
  {id:'tyler',av:'TJ',bg:'#1D7A4F',name:'Tyler James',title:'VA',status:'training',account:'TechNova Inc',trainer:'Brandon Torres',startDate:'Feb 16, 2026',modsDone:4,modsTotal:8,taskComp:52,tasksRun:2140,issues:['Account has 2 open high-severity tickets','Salesforce permissions causing automation failures'],bio:'Mid-stage VA still completing training. Currently impacted by account-level technical issues outside his control.',skills:['Salesforce','Make (Integromat)','Slack']},
  {id:'aisha',av:'AP',bg:'#6A4A9A',name:'Aisha Patel',title:'VA',status:'active',account:'Skyline Ventures',trainer:'Kara Collins',startDate:'Mar 18, 2026',modsDone:6,modsTotal:8,taskComp:84,tasksRun:1890,issues:['2 training modules remaining before full certification'],bio:'Strong performance for a relatively new VA. Completing final training modules.',skills:['HubSpot','Zapier','Lead Routing','CRM Automation']},
  {id:'jordan',av:'JL',bg:'#AA4A1A',name:'Jordan Lee',title:'VA',status:'training',account:'Blueridge Digital',trainer:'Yvonne Mills',startDate:'Dec 10, 2025',modsDone:5,modsTotal:8,taskComp:74,tasksRun:1430,issues:['Lead response time KPI flagged at risk on assigned account'],bio:'In progress on training. Blueridge account has a lead response SLA concern.',skills:['HubSpot','Email Sequences','Slack']},
  {id:'natalie',av:'NW',bg:'#1A7A7A',name:'Natalie Wong',title:'Junior VA',status:'onboarding',account:'Coral Dynamics',trainer:'Brandon Torres / Yvonne Mills',startDate:'May 12, 2026',modsDone:1,modsTotal:8,taskComp:15,tasksRun:320,issues:['Early stage — only 1 of 8 modules complete','Account still in Phase 1 Discovery'],bio:'Brand new VA in onboarding. Coral Dynamics is a new account and both are in early stages.',skills:['Getting started']},
];

// ─────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────
const fm = { fontFamily: "'IBM Plex Mono', monospace" };
const fd = { fontFamily: "'Syne', sans-serif" };
const fb = { fontFamily: "'IBM Plex Sans', sans-serif" };

function StagePill({ stage }) {
  const c = STAGE_COLORS[stage] || T.ink3;
  return (
    <span style={{ display:'inline-block', padding:'2px 8px', fontFamily:"'IBM Plex Mono',monospace", fontSize:10, border:'1px solid', color:c, background:c+'18', borderColor:c+'44', whiteSpace:'nowrap' }}>
      {stage || '—'}
    </span>
  );
}

function Pill({ type, children }) {
  const styles = {
    pg: { color:T.green,  background:T.greenBg,  borderColor:'rgba(29,122,79,.25)' },
    py: { color:T.yellow, background:T.yellowBg, borderColor:'rgba(176,125,16,.25)' },
    pr: { color:T.red,    background:T.redBg,    borderColor:'rgba(192,32,32,.25)' },
    pb: { color:T.blue,   background:T.blueBg,   borderColor:'rgba(26,95,170,.25)' },
    pgr:{ color:T.ink3,   background:T.surface2,  borderColor:T.border2 },
  };
  const s = styles[type] || styles.pgr;
  return (
    <span style={{ display:'inline-block', padding:'2px 8px', ...fm, fontSize:10, border:'1px solid', whiteSpace:'nowrap', ...s }}>
      {children}
    </span>
  );
}

function PBar({ pct, color }) {
  const c = color === 'pg' ? T.green : color === 'py' ? '#D4A017' : color === 'pr' ? T.red : T.lava;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <div style={{ width:80, height:5, background:T.surface2, border:`1px solid ${T.border}`, flexShrink:0 }}>
        <div style={{ width:`${pct}%`, height:'100%', background:c }} />
      </div>
      <span style={{ ...fm, fontSize:11, color:T.ink3 }}>{pct}%</span>
    </div>
  );
}

function Avatar({ av, bg, size = 38 }) {
  return (
    <div style={{ width:size, height:size, background:bg, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', ...fd, fontSize:size*0.4, fontWeight:700, flexShrink:0 }}>
      {av}
    </div>
  );
}

function FieldGroup({ children }) {
  return <div style={{ background:T.surface, border:`1px solid ${T.border}`, marginBottom:12 }}>{children}</div>;
}

function Field({ label, value, half }) {
  return (
    <div style={{ padding:'12px 14px', borderBottom:`1px solid ${T.border}`, width: half ? '50%' : '100%' }}>
      <div style={{ ...fm, fontSize:10, letterSpacing:2, textTransform:'uppercase', color:T.ink3, marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:13, color:T.ink }}>{value || '—'}</div>
    </div>
  );
}

function Row2({ children }) {
  return <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr' }}>{children}</div>;
}

function csColor(s) { return s==='Healthy'?T.green:s==='At Risk'?T.yellow:T.red; }
function fulfillColor(s) { return s==='Active'?T.green:s==='Paused'?T.yellow:T.red; }
function dayColor(d) { if(d===null||d==='not yet') return d==='not yet'?T.lava:T.ink3; return d>=30?T.red:d>=14?'#D4A017':T.ink; }
function fcClass(f) { return f==='Active'?'pg':f==='Paused'?'py':'pr'; }
function ccClass(c) { return c==='Healthy'?'pg':c==='At Risk'?'py':c==='New'?'pb':'pr'; }
function getAcctDetail(id) { return ACCT_DETAIL[id] || { profile:{agencyName:'—',location:'—',phone:'—',startDate:'—',onboardingDate:null,trainingDate:null,goLiveDate:null,plan:'—',fulfillment:'—',csStatus:'—',cancelDate:null,crm:'—',ams:'—',website:'',googleReview:'',techList:[],openTickets:0}, contacts:{va:null,lava:[],agency:[]}, tickets:{open:[],closed:[]}, meetings:{scheduled:[],previous:[]}, meetingContacts:[], meetingRecs:[], meetingAsks:[], notes:{sales:[],am:[],pm:[],dev:[]}, timeline:[] }; }

// ─────────────────────────────────────────────
//  GLOBAL STYLE (injected once)
// ─────────────────────────────────────────────
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap');
*{margin:0;padding:0;box-sizing:border-box;}
body{background:${T.bg};color:${T.ink};font-family:'IBM Plex Sans',sans-serif;font-size:14px;}
::-webkit-scrollbar{width:4px;} ::-webkit-scrollbar-thumb{background:${T.border2};}
.tbl{width:100%;border-collapse:collapse;}
.tbl th{font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${T.ink3};padding:8px 10px;text-align:left;border-bottom:2px solid ${T.border2};white-space:nowrap;cursor:pointer;user-select:none;}
.tbl th:hover{color:${T.lava};}
.tbl td{padding:10px;border-bottom:1px solid ${T.border};font-size:13px;vertical-align:middle;}
.tbl tbody tr{cursor:pointer;} .tbl tbody tr:hover td{background:${T.surface2};}
.atab{background:none;border:none;border-bottom:2px solid transparent;padding:10px 18px;font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${T.ink3};cursor:pointer;margin-bottom:-2px;transition:all .15s;}
.atab:hover{color:${T.ink};} .atab.on{color:${T.lava};border-bottom-color:${T.lava};}
.sb-btn{display:flex;align-items:center;gap:10px;padding:10px 20px;cursor:pointer;font-size:13px;color:#777;border-left:2px solid transparent;background:none;border-top:none;border-right:none;border-bottom:none;width:100%;text-align:left;font-family:'IBM Plex Sans',sans-serif;transition:all .15s;}
.sb-btn:hover{color:#E8E5E0;background:rgba(255,255,255,.03);}
.sb-btn.on{color:#F0EDE8;border-left-color:${T.lava};background:rgba(217,58,12,.08);}
.stat-card{background:${T.surface};border:1px solid ${T.border};padding:16px 18px;cursor:pointer;transition:box-shadow .15s,border-color .15s;}
.stat-card:hover{box-shadow:0 2px 12px rgba(0,0,0,.1);border-color:${T.lava};}
.page-enter{animation:fu .2s ease;}
@keyframes fu{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
input,select,textarea{font-family:'IBM Plex Sans',sans-serif;outline:none;}
input:focus,select:focus,textarea:focus{border-color:${T.lava} !important;}
`;

// ─────────────────────────────────────────────
//  ACCOUNT DETAIL TABS
// ─────────────────────────────────────────────
function TabOverview({ d }) {
  const p = d.profile;
  const tech = p.techList.map(t => (
    <span key={t} style={{ background:T.surface2, border:`1px solid ${T.border}`, padding:'3px 10px', ...fm, fontSize:11, color:T.ink2 }}>{t}</span>
  ));
  const statusField = (label, value, color) => (
    <div style={{ padding:'14px 16px', borderBottom:`1px solid ${T.border}` }}>
      <div style={{ ...fm, fontSize:10, letterSpacing:2, textTransform:'uppercase', color:T.ink3, marginBottom:5 }}>{label}</div>
      <span style={{ fontSize:13, fontWeight:600, color }}>{value}</span>
    </div>
  );
  return (
    <div>
      <FieldGroup>
        <Field label="Agency Name" value={p.agencyName} />
        <Row2><Field label="Location" value={p.location} half /><Field label="Phone" value={p.phone} half /></Row2>
      </FieldGroup>
      <FieldGroup>
        <Row2><Field label="Client Start Date" value={p.startDate} half /><Field label="Onboarding Date" value={p.onboardingDate || '—'} half /></Row2>
        <Row2><Field label="Training Date" value={p.trainingDate || '—'} half /><Field label="Go-Live Date" value={p.goLiveDate || 'Not yet set'} half /></Row2>
        <Field label="Plan" value={p.plan} />
        <Row2>
          <div style={{ width:'50%' }}>{statusField('Fulfillment Status', p.fulfillment, fulfillColor(p.fulfillment))}</div>
          <div style={{ width:'50%' }}>{statusField('CS Status', p.csStatus, csColor(p.csStatus))}</div>
        </Row2>
        <Field label="Cancellation Date" value={p.cancelDate || 'N/A'} />
      </FieldGroup>
      <FieldGroup>
        <Row2><Field label="CRM" value={p.crm} half /><Field label="AMS" value={p.ams} half /></Row2>
        <Row2>
          <div style={{ padding:'14px 16px', borderBottom:`1px solid ${T.border}`, width:'50%' }}>
            <div style={{ ...fm, fontSize:10, letterSpacing:2, textTransform:'uppercase', color:T.ink3, marginBottom:5 }}>Website</div>
            {p.website ? <a href={p.website} target="_blank" rel="noreferrer" style={{ fontSize:13, color:T.blue, textDecoration:'none' }}>🌐 Visit Website</a> : <span style={{ color:T.ink3 }}>—</span>}
          </div>
          <div style={{ padding:'14px 16px', borderBottom:`1px solid ${T.border}`, width:'50%' }}>
            <div style={{ ...fm, fontSize:10, letterSpacing:2, textTransform:'uppercase', color:T.ink3, marginBottom:5 }}>Google Review</div>
            {p.googleReview ? <a href={p.googleReview} target="_blank" rel="noreferrer" style={{ fontSize:13, color:T.blue, textDecoration:'none' }}>⭐ Open Review Link</a> : <span style={{ color:T.ink3 }}>—</span>}
          </div>
        </Row2>
        <div style={{ padding:'14px 16px', borderBottom:`1px solid ${T.border}` }}>
          <div style={{ ...fm, fontSize:10, letterSpacing:2, textTransform:'uppercase', color:T.ink3, marginBottom:8 }}>Tech List</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>{tech}</div>
        </div>
      </FieldGroup>
      <FieldGroup>
        <div style={{ padding:14 }}>
          <div style={{ ...fm, fontSize:10, letterSpacing:2, textTransform:'uppercase', color:T.ink3, marginBottom:6 }}>Open Ticket Count</div>
          <div style={{ ...fd, fontSize:36, fontWeight:800, color: p.openTickets > 0 ? T.red : T.green }}>
            {p.openTickets} <span style={{ ...fb, fontSize:13, color:T.ink3, fontWeight:400 }}>{p.openTickets === 1 ? 'open ticket' : 'open tickets'}</span>
          </div>
        </div>
      </FieldGroup>
    </div>
  );
}

function ContactCard({ av, bg, name, role, email, emailLabel, scheduler }) {
  return (
    <div style={{ background:T.surface, border:`1px solid ${T.border}`, padding:16, display:'flex', gap:12, alignItems:'flex-start' }}>
      <Avatar av={av} bg={bg} size={40} />
      <div style={{ flex:1 }}>
        <div style={{ fontSize:13, fontWeight:600, marginBottom:2 }}>{name}</div>
        <div style={{ ...fm, fontSize:10, color:T.ink3, marginBottom:8 }}>{role}</div>
        <a href={`mailto:${email}`} style={{ ...fm, fontSize:11, color:T.blue, textDecoration:'none', display:'block', marginBottom:4 }}>✉ {emailLabel || 'Email'}: {email}</a>
        {scheduler && <a href={scheduler} target="_blank" rel="noreferrer" style={{ ...fm, fontSize:11, color:T.lava, textDecoration:'none', display:'block', marginTop:4 }}>📅 Scheduler Link</a>}
      </div>
    </div>
  );
}

function TabContacts({ d }) {
  const c = d.contacts;
  const secLabel = (txt) => <div style={{ ...fm, fontSize:10, letterSpacing:3, color:T.ink3, textTransform:'uppercase', margin:'18px 0 10px' }}>{txt}</div>;
  return (
    <div>
      {secLabel('Virtual Assistant')}
      {c.va
        ? <ContactCard av={c.va.av} bg={c.va.bg} name={c.va.name} role="Virtual Assistant" email={c.va.agencyEmail} emailLabel="Agency Email" />
        : <div style={{ color:T.ink3, fontSize:13 }}>No VA assigned.</div>
      }
      {secLabel('Agency Contacts')}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:10 }}>
        {c.agency.map(a => <ContactCard key={a.email} av={a.av} bg={a.bg} name={a.name} role={a.role} email={a.email} />)}
      </div>
      {secLabel('LAVA Contacts')}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:10 }}>
        {c.lava.map(l => <ContactCard key={l.email} av={l.av} bg={l.bg} name={l.name} role={l.role} email={l.email} scheduler={l.scheduler} />)}
      </div>
    </div>
  );
}

function TabTickets({ d }) {
  const TktRow = ({ t, closed }) => {
    const sc = t.severity==='High'?'pr':t.severity==='Medium'?'py':'pg';
    const bc = t.severity==='High'?T.red:t.severity==='Medium'?'#D4A017':T.green;
    return (
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderLeft:`3px solid ${bc}`, padding:'13px 15px', marginBottom:8 }}>
        <div style={{ ...fm, fontSize:10, color:T.ink3, marginBottom:3 }}>#{t.id} · {t.category}</div>
        <div style={{ fontSize:14, fontWeight:500, marginBottom:6 }}>{t.title}</div>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap', ...fm, fontSize:10, color:T.ink3 }}>
          <Pill type={sc}>{t.severity}</Pill>
          <span>Opened: {t.date}</span>
          {closed && t.resolved && <span style={{ color:T.green }}>✓ Resolved: {t.resolved}</span>}
        </div>
      </div>
    );
  };
  return (
    <div>
      <div style={{ ...fm, fontSize:10, letterSpacing:3, color:T.ink3, textTransform:'uppercase', marginBottom:10 }}>Open Tickets</div>
      {d.tickets.open.length ? d.tickets.open.map(t => <TktRow key={t.id} t={t} />) : <div style={{ color:T.green, ...fm, fontSize:13, padding:'16px 0' }}>✓ No open tickets</div>}
      <div style={{ ...fm, fontSize:10, letterSpacing:3, color:T.ink3, textTransform:'uppercase', margin:'20px 0 10px' }}>Closed Tickets</div>
      {d.tickets.closed.length ? d.tickets.closed.map(t => <TktRow key={t.id} t={t} closed />) : <div style={{ color:T.ink3, ...fm, fontSize:13, padding:'16px 0' }}>No closed tickets on record.</div>}
    </div>
  );
}

function TabMeetings({ d }) {
  const MtgRow = ({ m }) => (
    <div style={{ background:T.surface, border:`1px solid ${T.border}`, padding:'14px 16px', marginBottom:8 }}>
      <div style={{ display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:6, marginBottom:6 }}>
        <div style={{ fontSize:13, fontWeight:600 }}>{m.type}</div>
        <div style={{ ...fm, fontSize:11, color:T.ink3 }}>{m.date} · {m.time}</div>
      </div>
      <div style={{ ...fm, fontSize:11, color:T.ink3, marginBottom:4 }}>Attendees: {m.attendees}</div>
      {m.notes && <div style={{ fontSize:12, color:T.ink2, marginTop:6, borderLeft:`2px solid ${T.border2}`, paddingLeft:10 }}>{m.notes}</div>}
    </div>
  );

  const DayRow = ({ role, name, days }) => {
    const isNotYet = days === 'not yet';
    const dc = isNotYet ? T.lava : dayColor(days);
    return (
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'11px 16px', borderBottom:`1px solid ${T.border}` }}>
        <div><span style={{ fontSize:13 }}>{role}</span>{name && name !== '—' && <span style={{ ...fm, fontSize:11, color:T.ink3, marginLeft:8 }}>· {name}</span>}</div>
        <span style={{ ...fm, fontSize:12, fontWeight:600, color:dc }}>{days === null ? '—' : isNotYet ? 'not yet' : `${days} days`}</span>
      </div>
    );
  };

  return (
    <div>
      {/* Days Since Last Meeting */}
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, marginBottom:14 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'12px 16px', borderBottom:`1px solid ${T.border}` }}>
          <span>⏱</span>
          <span style={{ ...fm, fontSize:10, letterSpacing:3, textTransform:'uppercase', color:T.ink3 }}>Days Since Last Meeting</span>
        </div>
        {(d.meetingContacts || []).map((c,i) => <DayRow key={i} {...c} />)}
      </div>

      {/* AI Recommendations */}
      {d.meetingRecs?.length > 0 && (
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, marginBottom:14 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', borderBottom:`1px solid ${T.border}` }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span>✦</span>
              <span style={{ ...fm, fontSize:10, letterSpacing:3, textTransform:'uppercase', color:T.ink3 }}>Recommendations</span>
            </div>
            <span style={{ ...fm, fontSize:9, letterSpacing:1, color:T.ink3, background:T.surface2, border:`1px solid ${T.border}`, padding:'2px 8px' }}>AI-generated</span>
          </div>
          <div style={{ padding:'4px 16px 8px' }}>
            {d.meetingRecs.map((r,i) => {
              const icon = r.type==='trend'?'↗':r.type==='idea'?'💡':'△';
              return (
                <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'10px 0', borderBottom:`1px solid ${T.border}` }}>
                  <span style={{ fontSize:13, color:T.ink3, flexShrink:0, marginTop:1 }}>{icon}</span>
                  <span style={{ fontSize:13, color:T.ink, lineHeight:1.5 }}>{r.text}</span>
                </div>
              );
            })}
          </div>
          <div style={{ padding:'6px 16px 10px', ...fm, fontSize:10, color:T.ink3 }}>Generated from account activity, ticket history, and KPI trends.</div>
        </div>
      )}

      {/* Asks */}
      {d.meetingAsks?.length > 0 && (
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, marginBottom:14 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'12px 16px', borderBottom:`1px solid ${T.border}` }}>
            <span>💬</span>
            <span style={{ ...fm, fontSize:10, letterSpacing:3, textTransform:'uppercase', color:T.ink3 }}>Asks — Days Since Last</span>
          </div>
          {d.meetingAsks.map((a,i) => <DayRow key={i} role={a.label} days={a.days} />)}
          <div style={{ padding:'10px 16px', ...fm, fontSize:10, color:T.ink3 }}>Project managers are measured on testimonials asked. This quarter: 2.</div>
        </div>
      )}

      <div style={{ ...fm, fontSize:10, letterSpacing:3, color:T.ink3, textTransform:'uppercase', marginBottom:10 }}>Scheduled Meetings</div>
      {d.meetings.scheduled.length ? d.meetings.scheduled.map((m,i) => <MtgRow key={i} m={m} />) : <div style={{ color:T.ink3, ...fm, fontSize:13, padding:'16px 0' }}>No meetings scheduled.</div>}
      <div style={{ ...fm, fontSize:10, letterSpacing:3, color:T.ink3, textTransform:'uppercase', margin:'20px 0 10px' }}>Previous Meetings</div>
      {d.meetings.previous.length ? d.meetings.previous.map((m,i) => <MtgRow key={i} m={m} />) : <div style={{ color:T.ink3, ...fm, fontSize:13, padding:'16px 0' }}>No previous meetings on record.</div>}
    </div>
  );
}

function NoteBlock({ deptKey, label, color, entries: initialEntries }) {
  const [entries, setEntries] = useState(initialEntries || []);
  const [histOpen, setHistOpen] = useState(false);
  const [newText, setNewText] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [saved, setSaved] = useState(false);

  const latest = entries[0] || null;
  const history = entries.slice(1);

  const saveNote = () => {
    if (!newText.trim()) return;
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const now = new Date();
    const dateStr = `${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
    setEntries([{ date:dateStr, author:newAuthor.trim()||'Staff', text:newText.trim() }, ...entries]);
    setNewText(''); setNewAuthor('');
    setSaved(true); setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderTop:`3px solid ${color}`, padding:18, marginBottom:12 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, ...fm, fontSize:10, letterSpacing:2, textTransform:'uppercase', color:T.ink3, marginBottom:14 }}>
        {label}
        {entries.length > 0 && (
          <span style={{ color, background:color+'18', border:`1px solid ${color}44`, padding:'1px 7px', fontSize:9 }}>
            {entries.length} note{entries.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>
      {latest ? (
        <>
          <div style={{ fontSize:13, lineHeight:1.7, color:T.ink, whiteSpace:'pre-wrap', marginBottom:10 }}>{latest.text}</div>
          <div style={{ ...fm, fontSize:10, color:T.ink3 }}>{latest.author} · {latest.date}</div>
        </>
      ) : <div style={{ fontSize:13, color:T.ink3 }}>No notes recorded.</div>}

      {history.length > 0 && (
        <>
          <button onClick={() => setHistOpen(!histOpen)} style={{ background:'none', border:`1px solid ${T.border}`, color:T.ink3, ...fm, fontSize:10, padding:'5px 12px', cursor:'pointer', marginTop:12, display:'flex', alignItems:'center', gap:6 }}>
            {histOpen ? '▾' : '▸'} {history.length} previous note{history.length > 1 ? 's' : ''}
          </button>
          {histOpen && (
            <div style={{ marginTop:12, border:`1px solid ${T.border}` }}>
              <div style={{ padding:'8px 14px', background:T.surface2, borderBottom:`1px solid ${T.border}`, ...fm, fontSize:9, letterSpacing:2, textTransform:'uppercase', color:T.ink3 }}>Previous Notes</div>
              {history.map((e,i) => (
                <div key={i} style={{ padding:'14px 16px', borderBottom:`1px solid ${T.border}` }}>
                  <div style={{ fontSize:13, lineHeight:1.7, color:T.ink2, whiteSpace:'pre-wrap', marginBottom:6 }}>{e.text}</div>
                  <div style={{ ...fm, fontSize:10, color:T.ink3 }}>{e.author} · {e.date}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <div style={{ marginTop:14, paddingTop:14, borderTop:`1px solid ${T.border}` }}>
        <div style={{ ...fm, fontSize:9, letterSpacing:2, textTransform:'uppercase', color:T.ink3, marginBottom:8 }}>Add Note</div>
        <textarea value={newText} onChange={e => setNewText(e.target.value)} rows={3} placeholder="Write a note…" style={{ width:'100%', background:T.surface2, border:`1px solid ${T.border}`, color:T.ink, padding:'9px 12px', fontSize:13, resize:'vertical', marginBottom:8 }} />
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <input value={newAuthor} onChange={e => setNewAuthor(e.target.value)} placeholder="Your name" style={{ background:T.surface2, border:`1px solid ${T.border}`, color:T.ink, padding:'7px 10px', ...fm, fontSize:11, width:160 }} />
          <button onClick={saveNote} style={{ background:color, color:'#fff', border:'none', padding:'8px 16px', ...fd, fontSize:12, fontWeight:700, letterSpacing:1, cursor:'pointer' }}>SAVE</button>
          {saved && <span style={{ ...fm, fontSize:11, color:T.green }}>✓ Saved</span>}
        </div>
      </div>
    </div>
  );
}

function TabNotes({ d }) {
  const depts = [
    { key:'sales', label:'Sales Notes', color:T.lava },
    { key:'am',    label:'Account Management Notes', color:T.blue },
    { key:'pm',    label:'Project Manager Notes', color:T.green },
    { key:'dev',   label:'Dev Support Notes', color:T.yellow },
  ];
  return (
    <div>
      {depts.map(dep => (
        <NoteBlock key={dep.key} deptKey={dep.key} label={dep.label} color={dep.color} entries={d.notes[dep.key] || []} />
      ))}
    </div>
  );
}

function TabTimeline({ d }) {
  const dotColor = { r:T.red, y:'#D4A017', b:T.blue, g:T.green, la:T.lava };
  return (
    <div style={{ position:'relative', paddingLeft:28 }}>
      <div style={{ position:'absolute', left:8, top:0, bottom:0, width:2, background:T.border }} />
      {d.timeline.map((e,i) => (
        <div key={i} style={{ position:'relative', marginBottom:20 }}>
          <div style={{ position:'absolute', left:-24, top:4, width:12, height:12, borderRadius:'50%', background:dotColor[e.color]||T.ink3, border:`2px solid ${T.surface}` }} />
          <div style={{ background:T.surface, border:`1px solid ${T.border}`, padding:'12px 14px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:4, marginBottom:4 }}>
              <div style={{ fontSize:13, fontWeight:600 }}>{e.label}</div>
              <div style={{ ...fm, fontSize:10, color:T.ink3 }}>{e.date}</div>
            </div>
            <div style={{ fontSize:12, color:T.ink2 }}>{e.detail}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function TabBuildScore({ acctId }) {
  const PIPELINES = [
    'Lead Generation Pipeline','Lead Routing & Assignment','Email Nurture Sequence','Follow-Up Automation',
    'Appointment Setting Pipeline','CRM Automation','Client Onboarding Automation','Review Generation Pipeline',
    'Renewal / Retention Pipeline','Reporting & Analytics Dashboard','Referral Pipeline',
    'Social Media Automation','SMS Outreach Automation','Internal Notification System','Deal Close Automation',
  ];
  const [checked, setChecked] = useState({});
  const [clientScore, setClientScore] = useState(7);
  const [clientNotes, setClientNotes] = useState('');

  const activeCount = Object.values(checked).filter(Boolean).length;
  const lavaScore = Math.round((activeCount / 15) * 10);
  const lavaLabel = lavaScore>=8?'Strong':lavaScore>=6?'On Track':lavaScore>=4?'Needs Attention':'At Risk';
  const lavaColor = lavaScore>=8?T.green:lavaScore>=6?T.yellow:lavaScore>=4?'#D4A017':T.red;
  const clientLabel = {1:'Critical',2:'Critical',3:'Poor',4:'Poor',5:'Fair',6:'Fair',7:'Good',8:'Good',9:'Excellent',10:'Excellent'}[clientScore];
  const clientColor = clientScore>=8?T.green:clientScore>=6?T.yellow:clientScore>=4?'#D4A017':T.red;

  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:18 }}>
        {/* Client Score */}
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, padding:20 }}>
          <div style={{ ...fm, fontSize:10, letterSpacing:2, textTransform:'uppercase', color:T.ink3, marginBottom:14 }}>Client Scoring</div>
          <div style={{ ...fm, fontSize:11, color:T.ink2, marginBottom:10 }}>How the client feels they are performing</div>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
            <div style={{ ...fd, fontSize:52, fontWeight:800, color:T.lava, lineHeight:1 }}>{clientScore}</div>
            <div style={{ ...fm, fontSize:11, color:T.ink3 }}>/10</div>
            <span style={{ ...fm, fontSize:11, padding:'3px 10px', border:'1px solid', color:clientColor, borderColor:clientColor+'44', background:clientColor+'18', marginLeft:4 }}>{clientLabel}</span>
          </div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:14 }}>
            {[1,2,3,4,5,6,7,8,9,10].map(n => (
              <button key={n} onClick={() => setClientScore(n)} style={{ width:34, height:34, border:`1px solid ${T.border}`, background:n===clientScore?T.lava:T.surface2, color:n===clientScore?'#fff':T.ink3, ...fm, fontSize:12, cursor:'pointer' }}>{n}</button>
            ))}
          </div>
          <label style={{ ...fm, fontSize:10, letterSpacing:2, textTransform:'uppercase', color:T.ink3, display:'block', marginBottom:6 }}>Notes</label>
          <textarea value={clientNotes} onChange={e => setClientNotes(e.target.value)} rows={3} placeholder="Client feedback or sentiment notes..." style={{ width:'100%', background:T.surface2, border:`1px solid ${T.border}`, color:T.ink, padding:'9px 12px', fontSize:13, resize:'vertical' }} />
        </div>
        {/* LAVA Score */}
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, padding:20 }}>
          <div style={{ ...fm, fontSize:10, letterSpacing:2, textTransform:'uppercase', color:T.ink3, marginBottom:14 }}>LAVA Scoring</div>
          <div style={{ ...fm, fontSize:11, color:T.ink2, marginBottom:10 }}>Based on active pipelines selected below</div>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
            <div style={{ ...fd, fontSize:52, fontWeight:800, color:T.lava, lineHeight:1 }}>{lavaScore}</div>
            <div style={{ ...fm, fontSize:11, color:T.ink3 }}>/10</div>
            <span style={{ ...fm, fontSize:11, padding:'3px 10px', border:'1px solid', color:lavaColor, borderColor:lavaColor+'44', background:lavaColor+'18', marginLeft:4 }}>{lavaLabel}</span>
          </div>
          <div style={{ height:8, background:T.surface2, border:`1px solid ${T.border}`, marginBottom:6 }}>
            <div style={{ width:`${lavaScore*10}%`, height:'100%', background:lavaColor, transition:'width .5s ease' }} />
          </div>
          <div style={{ ...fm, fontSize:10, color:T.ink3 }}>{activeCount} of 15 pipelines active</div>
        </div>
      </div>
      {/* Pipelines */}
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, padding:20 }}>
        <div style={{ ...fm, fontSize:10, letterSpacing:2, textTransform:'uppercase', color:T.ink3, marginBottom:4 }}>Active Pipelines</div>
        <div style={{ ...fm, fontSize:11, color:T.ink2, marginBottom:14 }}>Select pipelines this client is currently running — LAVA score updates automatically</div>
        <div style={{ background:T.surface2, border:`1px solid ${T.border}` }}>
          {PIPELINES.map(p => (
            <label key={p} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderBottom:`1px solid ${T.border}`, cursor:'pointer' }}>
              <input type="checkbox" checked={!!checked[p]} onChange={e => setChecked(prev => ({ ...prev, [p]:e.target.checked }))} style={{ width:15, height:15, accentColor:T.lava, cursor:'pointer', flexShrink:0 }} />
              <span style={{ fontSize:13 }}>{p}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  ACCOUNT DETAIL
// ─────────────────────────────────────────────
function AccountDetail({ acctId, accounts, supabase, onBack, initialTab }) {
  const [activeTab, setActiveTab] = useState(initialTab || 'overview');
  const acct = accounts.find(a => a.id === acctId) || {};
  const cc = ccClass(acct.csStatus);

  // Pass 2: per-account detail from real tables. Overview / Tickets / Meetings /
  // Notes / Timeline are wired to Supabase; Contacts / KPIs / Build Score stay
  // on the mock default (no backing data in the schema yet).
  const [d, setD] = useState(() => getAcctDetail(acctId));
  useEffect(() => {
    let alive = true;
    (async () => {
      const fmt = (x) => x ? new Date(x).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
      const sev = { H: 'High', M: 'Medium', L: 'Low' };
      const [acctRes, ticketsRes, meetingsRes, notesRes, tlRes, empRes] = await Promise.all([
        supabase.from('accounts').select('plan,crm,ams,fulfillment,cs_status,since_date,cancel_date,hubspot_company_id').eq('account_id', acctId).maybeSingle(),
        supabase.from('tickets').select('ticket_id,title,priority,status,created_at,resolved_at').eq('account_id', acctId).order('created_at', { ascending: false }),
        supabase.from('meetings').select('type,title,status,meeting_date,scheduled_minutes,actual_minutes').eq('account_id', acctId).order('meeting_date', { ascending: false }),
        supabase.from('notes').select('department,author_id,body,created_at').eq('account_id', acctId).order('created_at', { ascending: false }),
        supabase.from('timeline_events').select('event_date,label,detail,color').eq('account_id', acctId).order('event_date', { ascending: false }),
        supabase.from('employees').select('id,name'),
      ]);
      if (!alive) return;
      const a = acctRes.data || {};
      let company = {};
      if (a.hubspot_company_id) {
        const { data: c } = await supabase.from('hubspot_companies').select('name,phone,city,state,domain').eq('id', a.hubspot_company_id).maybeSingle();
        company = c || {};
      }
      const empName = Object.fromEntries((empRes.data || []).map(e => [e.id, e.name]));
      const tickets = ticketsRes.data || [];
      const tRow = (t) => ({ id: String(t.ticket_id).slice(0, 8), title: t.title, severity: sev[t.priority] || t.priority, date: fmt(t.created_at), category: 'Dev Support', resolved: fmt(t.resolved_at) });
      const open = tickets.filter(t => t.status !== 'resolved').map(tRow);
      const closed = tickets.filter(t => t.status === 'resolved').map(tRow);
      const mtgRow = (m) => ({ type: m.type || m.title || 'Meeting', date: fmt(m.meeting_date), time: m.actual_minutes ? `${m.actual_minutes} min` : (m.scheduled_minutes ? `${m.scheduled_minutes} min planned` : ''), attendees: '—', notes: m.title || '' });
      const meetingsAll = meetingsRes.data || [];
      const scheduled = meetingsAll.filter(m => m.status === 'scheduled').map(mtgRow);
      const previous = meetingsAll.filter(m => m.status !== 'scheduled').map(mtgRow);
      const noteBucket = { sales: [], am: [], pm: [], dev: [] };
      (notesRes.data || []).forEach(n => {
        const dep = (n.department || '').toLowerCase();
        const key = dep.includes('sales') ? 'sales' : (dep.includes('account') || dep === 'am') ? 'am' : dep.includes('dev') ? 'dev' : 'pm';
        noteBucket[key].push({ date: fmt(n.created_at), author: empName[n.author_id] || 'Staff', text: n.body || '' });
      });
      const timeline = (tlRes.data || []).map(e => ({ date: fmt(e.event_date), label: e.label, detail: e.detail, color: e.color }));
      setD({
        profile: {
          agencyName: company.name || acct.name || '—',
          location: [company.city, company.state].filter(Boolean).join(', ') || '—',
          phone: company.phone || '—',
          startDate: fmt(a.since_date) || '—',
          onboardingDate: null, trainingDate: null, goLiveDate: null,
          plan: a.plan || '—', fulfillment: a.fulfillment || '—', csStatus: a.cs_status || '—',
          cancelDate: a.cancel_date ? fmt(a.cancel_date) : null,
          crm: a.crm || '—', ams: a.ams || '—',
          website: company.domain ? (String(company.domain).startsWith('http') ? company.domain : 'https://' + company.domain) : '',
          googleReview: '', techList: [], openTickets: open.length,
        },
        contacts: { va: null, lava: [], agency: [] },
        tickets: { open, closed },
        meetings: { scheduled, previous },
        meetingContacts: [], meetingRecs: [], meetingAsks: [],
        notes: noteBucket,
        timeline,
      });
    })();
    return () => { alive = false; };
  }, [acctId, supabase, acct.name]);

  const tabs = [
    { key:'overview',   label:'Agency Overview' },
    { key:'contacts',   label:'Contacts' },
    { key:'kpis',       label:'KPIs' },
    { key:'buildscore', label:'Build Score' },
    { key:'tickets',    label:'Dev Support Queue' },
    { key:'meetings',   label:'Meetings' },
    { key:'notes',      label:'Notes' },
    { key:'timeline',   label:'Activity Timeline' },
  ];

  return (
    <div className="page-enter">
      <button onClick={onBack} style={{ background:'none', border:`1px solid ${T.border}`, color:T.ink2, ...fm, fontSize:11, padding:'7px 14px', cursor:'pointer', marginBottom:18 }}>← Back to Accounts</button>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10, marginBottom:6 }}>
        <div style={{ ...fd, fontSize:26, fontWeight:800 }}>{acct.name || d.profile.agencyName}</div>
        <Pill type={cc}>{acct.csStatus}</Pill>
      </div>
      <div style={{ ...fm, fontSize:11, color:T.ink3, marginBottom:18 }}>
        {d.profile.location} &nbsp;·&nbsp; PM: {acct.pm} &nbsp;·&nbsp; <StagePill stage={acct.stage} /> &nbsp; Since {acct.since}
      </div>
      <div style={{ display:'flex', gap:0, borderBottom:`2px solid ${T.border}`, marginBottom:20, overflowX:'auto' }}>
        {tabs.map(t => (
          <button key={t.key} className={`atab${activeTab===t.key?' on':''}`} onClick={() => setActiveTab(t.key)}>{t.label}</button>
        ))}
      </div>
      {activeTab === 'overview'   && <TabOverview d={d} />}
      {activeTab === 'contacts'   && <TabContacts d={d} />}
      {activeTab === 'kpis'       && <div style={{ padding:'60px 20px', textAlign:'center' }}><div style={{ ...fd, fontSize:28, fontWeight:800, marginBottom:8 }}>KPIs — Coming Soon</div><div style={{ ...fm, fontSize:12, color:T.ink3 }}>This tab will be activated in a future release.</div></div>}
      {activeTab === 'buildscore' && <TabBuildScore acctId={acctId} />}
      {activeTab === 'tickets'    && <TabTickets d={d} />}
      {activeTab === 'meetings'   && <TabMeetings d={d} />}
      {activeTab === 'notes'      && <TabNotes d={d} />}
      {activeTab === 'timeline'   && <TabTimeline d={d} />}
    </div>
  );
}

// ─────────────────────────────────────────────
//  PAGES
// ─────────────────────────────────────────────
function Dashboard({ onNav, onOpenAcct, accounts, supabase }) {
  const csOrder = {Cancelled:0,'At Risk':1,New:2,Healthy:3};
  const sorted = [...accounts].sort((a,b) => (csOrder[a.csStatus]||9)-(csOrder[b.csStatus]||9));
  const [vaCount, setVaCount] = useState(0);
  const [pendingMtgs, setPendingMtgs] = useState(0);
  const [activity, setActivity] = useState([]);
  useEffect(() => {
    let alive = true;
    (async () => {
      const [vasRes, mtgRes, logRes] = await Promise.all([
        supabase.from('vas').select('employee_id', { count: 'exact', head: true }),
        supabase.from('meetings').select('meeting_id', { count: 'exact', head: true }).eq('status', 'scheduled'),
        supabase.from('activity_log').select('app,action,actor_email,created_at').order('created_at', { ascending: false }).limit(6),
      ]);
      if (!alive) return;
      setVaCount(vasRes.count || 0);
      setPendingMtgs(mtgRes.count || 0);
      const appColor = { devsupport: 'r', qa: 'la', training: 'g', clientprofile: 'b', portal: 'y' };
      setActivity((logRes.data || []).map(l => ({
        c: appColor[l.app] || 'b',
        text: <><strong>{l.actor_email || 'Someone'}</strong> · {l.action}</>,
        sub: new Date(l.created_at).toLocaleString(),
      })));
    })();
    return () => { alive = false; };
  }, [supabase]);
  const openTix = accounts.reduce((s, a) => s + (a.tix || 0), 0);
  const stats = [
    { n:accounts.length, label:'Active Accounts', sub:'', page:'accounts', nc:T.ink },
    { n:openTix,         label:'Open Tickets',    sub:'', page:'tickets', nc:T.red },
    { n:vaCount,         label:'Active VAs',       sub:'', page:'vaoverview', nc:T.ink },
    { n:pendingMtgs,     label:'Pending Meetings', sub:'', page:'meetings', nc:T.yellow },
  ];
  const dotC = {r:T.red,b:T.blue,g:T.green,la:T.lava,y:'#D4A017'};
  return (
    <div className="page-enter">
      <div style={{ marginBottom:22 }}><h2 style={{ ...fd, fontSize:28, fontWeight:800 }}>Operations Dashboard</h2><p style={{ ...fm, fontSize:11, color:T.ink3, marginTop:3 }}>Snapshot · May 29, 2026</p></div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:14 }}>
        {stats.map(s => (
          <div key={s.page} className="stat-card" onClick={() => onNav(s.page)}>
            <div style={{ ...fd, fontSize:36, fontWeight:800, lineHeight:1, color:s.nc }}>{s.n}</div>
            <div style={{ ...fm, fontSize:10, letterSpacing:2, textTransform:'uppercase', color:T.ink3, marginTop:4 }}>{s.label}</div>
            <div style={{ ...fm, fontSize:11, marginTop:6, color:T.green }}>{s.sub}</div>
            <div style={{ ...fm, fontSize:9, color:T.lava, marginTop:8, letterSpacing:1 }}>VIEW ALL →</div>
          </div>
        ))}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, padding:18 }}>
          <div style={{ ...fm, fontSize:10, letterSpacing:3, textTransform:'uppercase', color:T.ink3, marginBottom:12 }}>Live Activity</div>
          {activity.map((a,i) => (
            <div key={i} style={{ display:'flex', gap:10, padding:'11px 0', borderBottom: i<activity.length-1?`1px solid ${T.border}`:'none' }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:dotC[a.c], marginTop:5, flexShrink:0 }} />
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, lineHeight:1.5 }}>{a.text}</div>
                <div style={{ ...fm, fontSize:10, color:T.ink3, marginTop:2 }}>{a.sub}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, padding:0, overflow:'auto' }}>
          <div style={{ padding:'14px 18px 10px', borderBottom:`1px solid ${T.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ ...fm, fontSize:10, letterSpacing:3, textTransform:'uppercase', color:T.ink3 }}>Account Health</div>
            <button onClick={() => onNav('accounts')} style={{ background:'none', border:'none', ...fm, fontSize:10, color:T.lava, cursor:'pointer', letterSpacing:1 }}>VIEW ALL →</button>
          </div>
          <table className="tbl">
            <thead><tr><th>Account</th><th>PM</th><th>Stage</th><th>Fulfillment</th><th>CS Status</th><th>Progress</th><th>Tickets</th></tr></thead>
            <tbody>
              {sorted.map(a => {
                const fc = fcClass(a.fulfillment), cc2 = ccClass(a.csStatus);
                return (
                  <tr key={a.id} onClick={() => onOpenAcct(a.id)}>
                    <td><strong>{a.name}</strong></td>
                    <td style={{ fontSize:12 }}>{a.pm}</td>
                    <td><StagePill stage={a.stage} /></td>
                    <td><Pill type={fc}>{a.fulfillment}</Pill></td>
                    <td><Pill type={cc2}>{a.csStatus}</Pill></td>
                    <td><PBar pct={a.pct} color={cc2} /></td>
                    <td onClick={e => { e.stopPropagation(); onOpenAcct(a.id, 'tickets'); }}>
                      {a.tix > 0 ? <span style={{ color:T.red, cursor:'pointer', textDecoration:'underline', ...fm }}>{a.tix}</span> : <span style={{ ...fm, color:T.ink3 }}>0</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AccountsPage({ onOpenAcct, accounts }) {
  const [view, setView] = useState('list');
  const [search, setSearch] = useState('');
  const [fPm, setFPm] = useState('');
  const [fStage, setFStage] = useState('');
  const [fCs, setFCs] = useState('');
  const [fFulfill, setFFulfill] = useState('');
  const [fTix, setFTix] = useState('');
  const [fProg, setFProg] = useState('');
  const [sort, setSort] = useState({ col:'name', dir:1 });

  const selStyle = { background:T.surface, border:`1px solid ${T.border}`, color:T.ink, padding:'7px 12px', ...fm, fontSize:11, cursor:'pointer' };

  const filtered = useMemo(() => {
    let data = accounts.filter(a => {
      if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (fPm && a.pm !== fPm) return false;
      if (fStage && a.stage !== fStage) return false;
      if (fCs && a.csStatus !== fCs) return false;
      if (fFulfill && a.fulfillment !== fFulfill) return false;
      if (fTix === '0' && a.tix > 0) return false;
      if (fTix === '1+' && a.tix === 0) return false;
      if (fProg) { const [lo,hi] = fProg.split('-').map(Number); if (a.pct < lo || a.pct > hi) return false; }
      return true;
    });
    data = [...data].sort((a,b) => {
      const av = a[sort.col] ?? '', bv = b[sort.col] ?? '';
      return av < bv ? -sort.dir : av > bv ? sort.dir : 0;
    });
    return data;
  }, [accounts, search, fPm, fStage, fCs, fFulfill, fTix, fProg, sort]);

  const sortBy = col => setSort(s => ({ col, dir: s.col===col ? -s.dir : 1 }));
  const arr = col => sort.col===col ? (sort.dir===1?'↑':'↓') : '↕';

  const clearAll = () => { setSearch(''); setFPm(''); setFStage(''); setFCs(''); setFFulfill(''); setFTix(''); setFProg(''); };

  const btnStyle = (active) => ({
    background: active ? T.lava : T.surface,
    border: 'none',
    borderLeft: `1px solid ${T.border}`,
    color: active ? '#fff' : T.ink3,
    padding:'7px 14px',
    ...fm, fontSize:11, letterSpacing:1, cursor:'pointer',
    display:'flex', alignItems:'center', gap:6,
  });

  return (
    <div className="page-enter">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:10, marginBottom:10 }}>
        <div><h2 style={{ ...fd, fontSize:28, fontWeight:800 }}>Accounts</h2><p style={{ ...fm, fontSize:11, color:T.ink3, marginTop:3 }}>{accounts.length} active client accounts</p></div>
        <div style={{ display:'flex', border:`1px solid ${T.border}`, overflow:'hidden', alignSelf:'center' }}>
          <button style={btnStyle(view==='list')} onClick={() => setView('list')}>
            <svg width="13" height="11" viewBox="0 0 13 11" fill="currentColor"><rect y="0" width="13" height="2"/><rect y="4.5" width="13" height="2"/><rect y="9" width="13" height="2"/></svg>List
          </button>
          <button style={btnStyle(view==='kanban')} onClick={() => setView('kanban')}>
            <svg width="13" height="11" viewBox="0 0 13 11" fill="currentColor"><rect x="0" y="0" width="3" height="11"/><rect x="5" y="0" width="3" height="8"/><rect x="10" y="0" width="3" height="11"/></svg>Pipeline
          </button>
        </div>
      </div>
      <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap', alignItems:'center' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search accounts…" style={{ ...selStyle, width:180, fontSize:12 }} />
        <select value={fPm} onChange={e => setFPm(e.target.value)} style={selStyle}><option value="">All PMs</option><option>Darek C.</option><option>Sam R.</option><option>Victoria S.</option></select>
        <select value={fStage} onChange={e => setFStage(e.target.value)} style={selStyle}><option value="">All Stages</option>{KANBAN_COLS.map(s => <option key={s}>{s}</option>)}</select>
        <select value={fCs} onChange={e => setFCs(e.target.value)} style={selStyle}><option value="">All CS Status</option><option>Healthy</option><option>At Risk</option><option>New</option></select>
        <select value={fFulfill} onChange={e => setFFulfill(e.target.value)} style={selStyle}><option value="">All Fulfillment</option><option>Active</option><option>Paused</option><option>Cancelled</option></select>
        <select value={fTix} onChange={e => setFTix(e.target.value)} style={selStyle}><option value="">All Tickets</option><option value="0">No open tickets</option><option value="1+">Has open tickets</option></select>
        <select value={fProg} onChange={e => setFProg(e.target.value)} style={selStyle}><option value="">All Progress</option><option value="0-25">0–25%</option><option value="26-50">26–50%</option><option value="51-75">51–75%</option><option value="76-100">76–100%</option></select>
        <button onClick={clearAll} style={{ background:'none', border:`1px solid ${T.border}`, color:T.ink3, ...fm, fontSize:11, padding:'7px 12px', cursor:'pointer' }}>Clear</button>
        <span style={{ ...fm, fontSize:11, color:T.ink3 }}>{filtered.length} of {accounts.length} accounts</span>
      </div>

      {view === 'list' && (
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, overflow:'auto' }}>
          <table className="tbl">
            <thead><tr>
              {[['name','Client'],['pm','PM'],['stage','Stage'],['fulfillment','Fulfillment'],['csStatus','CS Status'],['pct','Progress'],['tix','Tickets'],['since','Since']].map(([col,lbl]) => (
                <th key={col} onClick={() => sortBy(col)}>{lbl} <span style={{ color:sort.col===col?T.lava:'inherit' }}>{arr(col)}</span></th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.map(a => {
                const fc = fcClass(a.fulfillment), cc2 = ccClass(a.csStatus);
                return (
                  <tr key={a.id} onClick={() => onOpenAcct(a.id)}>
                    <td><strong>{a.name}</strong></td>
                    <td>{a.pm}</td>
                    <td><StagePill stage={a.stage} /></td>
                    <td><Pill type={fc}>{a.fulfillment}</Pill></td>
                    <td><Pill type={cc2}>{a.csStatus}</Pill></td>
                    <td><PBar pct={a.pct} color={cc2} /></td>
                    <td onClick={e => { e.stopPropagation(); onOpenAcct(a.id, 'tickets'); }}>
                      {a.tix > 0 ? <span style={{ color:T.red, cursor:'pointer', textDecoration:'underline', ...fm }}>{a.tix}</span> : <span style={{ ...fm, color:T.ink3 }}>0</span>}
                    </td>
                    <td style={{ ...fm, fontSize:12, color:T.ink3 }}>{a.since}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {view === 'kanban' && (
        <div style={{ overflowX:'auto', paddingBottom:16, minHeight:400 }}>
          <div style={{ display:'flex', gap:12, minWidth:'max-content', alignItems:'flex-start' }}>
            {KANBAN_COLS.map(col => {
              const cards = filtered.filter(a => a.stage === col);
              const cc2 = STAGE_COLORS[col] || T.ink3;
              return (
                <div key={col} style={{ width:280, flexShrink:0 }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'11px 14px', background:T.surface, border:`1px solid ${T.border}`, borderTop:`3px solid ${cc2}`, marginBottom:10, position:'sticky', top:0, zIndex:2 }}>
                    <span style={{ ...fm, fontSize:10, letterSpacing:2, textTransform:'uppercase', color:T.ink, fontWeight:700 }}>{col}</span>
                    <span style={{ ...fm, fontSize:11, fontWeight:700, color:cc2, background:cc2+'18', border:`1px solid ${cc2}44`, padding:'1px 8px' }}>{cards.length}</span>
                  </div>
                  {cards.length === 0
                    ? <div style={{ background:T.surface, border:`1px dashed ${T.border}`, padding:'32px 12px', textAlign:'center', ...fm, fontSize:11, color:T.ink3, letterSpacing:1 }}>Empty</div>
                    : cards.map(a => {
                        const cc3 = a.csStatus==='Healthy'?T.green:a.csStatus==='At Risk'?'#D4A017':T.blue;
                        return (
                          <div key={a.id} onClick={() => onOpenAcct(a.id)} style={{ background:T.surface, border:`1px solid ${T.border}`, borderLeft:`3px solid ${cc2}`, padding:'14px 15px', marginBottom:10, cursor:'pointer' }}>
                            <div style={{ fontSize:13, fontWeight:600, marginBottom:5 }}>{a.name}</div>
                            <div style={{ ...fm, fontSize:10, color:T.ink3, marginBottom:8 }}>{a.pm}</div>
                            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                              <div style={{ flex:1, height:5, background:T.surface2, border:`1px solid ${T.border}` }}><div style={{ width:`${a.pct}%`, height:'100%', background:cc3 }} /></div>
                              <span style={{ ...fm, fontSize:10, color:T.ink3, flexShrink:0 }}>{a.pct}%</span>
                            </div>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                              <span style={{ ...fm, fontSize:10, fontWeight:600, color:cc3 }}>{a.csStatus}</span>
                              <span style={{ ...fm, fontSize:10, color: a.tix>0?T.red:T.ink3 }}>{a.tix>0?`${a.tix} ticket${a.tix>1?'s':''}`:'No tickets'}</span>
                            </div>
                          </div>
                        );
                      })
                  }
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const DEV_MEMBERS = [
  { name:'Alex M.',    av:'AM', bg:'#1A5FAA', specialty:'HubSpot · Zapier · Webhooks' },
  { name:'Priya S.',   av:'PS', bg:'#6A3A9A', specialty:'Salesforce · API Integrations' },
  { name:'Carlos R.',  av:'CR', bg:'#1D7A4F', specialty:'Make · CRM Sync · Automation' },
];

const TKT_PIPELINE_STAGES = ['New','In Progress','Waiting on Client','Delayed','Completed'];
const TKT_STAGE_COLORS = {
  'New':               T.blue,
  'In Progress':       T.lava,
  'Waiting on Client': T.yellow,
  'Delayed':           T.red,
  'Completed':         T.green,
};

const ALL_TICKETS = [
  {id:'TKT-0042',acct:'TechNova Inc',    title:'Automation triggers not firing on new lead creation',         sev:'High',   status:'open',        stage:'New',               type:'Technical / Bug',        date:'May 29, 2026', pm:'Sam R.',      dev:'Priya S.'},
  {id:'TKT-0041',acct:'Blueridge Digital',title:'Lead response time not meeting SLA — needs workflow review', sev:'Medium', status:'open',        stage:'New',               type:'Quality of Deliverable', date:'May 28, 2026', pm:'Darek C.',    dev:'Carlos R.'},
  {id:'TKT-0040',acct:'Skyline Ventures', title:'CRM sync duplicating contact records on import',             sev:'High',   status:'in-progress', stage:'In Progress',       type:'Technical / Bug',        date:'May 27, 2026', pm:'Victoria S.', dev:'Priya S.'},
  {id:'TKT-0039',acct:'Acme Corp',        title:'Slack notification not triggering for deal closures',        sev:'Low',    status:'open',        stage:'Waiting on Client', type:'Technical / Bug',        date:'May 26, 2026', pm:'Darek C.',    dev:'Alex M.'},
  {id:'TKT-0038',acct:'Meridian Group',   title:'Phase 4 VA training materials not accessible',               sev:'Medium', status:'in-progress', stage:'In Progress',       type:'Training Gap',           date:'May 25, 2026', pm:'Victoria S.', dev:'Carlos R.'},
  {id:'TKT-0037',acct:'Acme Corp',        title:'HubSpot field mapping incorrect for phone numbers',          sev:'Low',    status:'resolved',    stage:'Completed',         type:'Technical / Bug',        date:'May 23, 2026', pm:'Darek C.',    dev:'Alex M.',   resolved:'May 23, 2026'},
  {id:'TKT-0036',acct:'Coral Dynamics',   title:'Onboarding credentials not delivered to VA team',            sev:'Low',    status:'resolved',    stage:'Completed',         type:'Onboarding',             date:'May 21, 2026', pm:'Darek C.',    dev:'Carlos R.', resolved:'May 21, 2026'},
  {id:'TKT-0035',acct:'GreenPath Agency', title:'Zapier zap not triggering on new form submission',           sev:'Medium', status:'open',        stage:'Delayed',           type:'Technical / Bug',        date:'May 20, 2026', pm:'Sam R.',      dev:'Alex M.'},
  {id:'TKT-0034',acct:'Hartwell & Sons',  title:'Email sequence skipping step 3 after lead qualification',   sev:'High',   status:'in-progress', stage:'Delayed',           type:'Technical / Bug',        date:'May 19, 2026', pm:'Darek C.',    dev:'Priya S.'},
  {id:'TKT-0033',acct:'Pinnacle Insurance',title:'Dashboard not reflecting updated KPI targets',              sev:'Low',    status:'resolved',    stage:'Completed',         type:'Quality of Deliverable', date:'May 17, 2026', pm:'Victoria S.', dev:'Carlos R.', resolved:'May 18, 2026'},
];

function TicketDetail({ ticket, onClose }) {
  const [notes, setNotes] = useState(ticket.notes || []);
  const [files, setFiles] = useState(ticket.files || []);
  const [newNote, setNewNote] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [noteSaved, setNoteSaved] = useState(false);
  const [activeTab, setActiveTab] = useState('notes');

  const bc = { High:T.red, Medium:'#D4A017', Low:T.green };
  const pclass = { High:'pr', Medium:'py', Low:'pg' };
  const devMember = DEV_MEMBERS.find(d => d.name === ticket.dev);
  const stageColor = TKT_STAGE_COLORS[ticket.stage] || T.ink3;

  const saveNote = () => {
    if (!newNote.trim()) return;
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const now = new Date();
    const dateStr = `${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
    setNotes(prev => [{ date:dateStr, author:newAuthor.trim()||'Staff', text:newNote.trim() }, ...prev]);
    setNewNote(''); setNewAuthor('');
    setNoteSaved(true); setTimeout(() => setNoteSaved(false), 3000);
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files);
    const newFiles = dropped.map(f => ({ name:f.name, size:`${(f.size/1024).toFixed(1)} KB`, date:'Just now', type:f.type }));
    setFiles(prev => [...newFiles, ...prev]);
  };

  return (
    <div style={{ position:'fixed', inset:0, zIndex:100, display:'flex', alignItems:'stretch' }}>
      {/* Backdrop */}
      <div onClick={onClose} style={{ flex:1, background:'rgba(0,0,0,0.35)' }} />
      {/* Drawer */}
      <div style={{ width:560, background:T.bg, display:'flex', flexDirection:'column', boxShadow:'-4px 0 24px rgba(0,0,0,.15)', overflowY:'auto' }}>
        {/* Drawer header */}
        <div style={{ background:T.surface, borderBottom:`1px solid ${T.border}`, padding:'16px 20px', position:'sticky', top:0, zIndex:10 }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                <span style={{ ...fm, fontSize:10, color:T.ink3 }}>#{ticket.id}</span>
                <span style={{ ...fm, fontSize:10, color:T.ink3 }}>·</span>
                <span style={{ ...fm, fontSize:10, color:T.ink3 }}>{ticket.acct}</span>
                <span style={{ display:'inline-block', padding:'1px 7px', ...fm, fontSize:9, border:'1px solid', color:stageColor, background:stageColor+'18', borderColor:stageColor+'44' }}>{ticket.stage}</span>
              </div>
              <div style={{ fontSize:16, fontWeight:700, lineHeight:1.4, marginBottom:8 }}>{ticket.title}</div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
                <Pill type={pclass[ticket.sev]}>{ticket.sev}</Pill>
                <span style={{ ...fm, fontSize:10, color:T.ink3 }}>{ticket.type}</span>
                <span style={{ ...fm, fontSize:10, color:T.ink3 }}>{ticket.date}</span>
                {ticket.pm && <span style={{ ...fm, fontSize:10, color:T.ink3 }}>PM: {ticket.pm}</span>}
                {devMember && (
                  <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <div style={{ width:18, height:18, background:devMember.bg, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontFamily:"'Syne',sans-serif", fontSize:7, fontWeight:700 }}>{devMember.av}</div>
                    <span style={{ ...fm, fontSize:10, color:T.ink3 }}>{ticket.dev}</span>
                  </div>
                )}
              </div>
            </div>
            <button onClick={onClose} style={{ background:'none', border:'none', color:T.ink3, cursor:'pointer', fontSize:20, lineHeight:1, flexShrink:0, padding:4 }}>✕</button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', borderBottom:`2px solid ${T.border}`, background:T.surface, paddingLeft:8 }}>
          {[['notes','Notes'],['files','Files']].map(([key,lbl]) => (
            <button key={key} className={`atab${activeTab===key?' on':''}`} onClick={() => setActiveTab(key)}>{lbl}
              {key==='notes' && notes.length > 0 && <span style={{ marginLeft:6, ...fm, fontSize:9, color:activeTab==='notes'?T.lava:T.ink3 }}>{notes.length}</span>}
              {key==='files' && files.length > 0 && <span style={{ marginLeft:6, ...fm, fontSize:9, color:activeTab==='files'?T.lava:T.ink3 }}>{files.length}</span>}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ flex:1, padding:20 }}>

          {/* NOTES TAB */}
          {activeTab === 'notes' && (
            <div>
              {/* Add note form */}
              <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderTop:`3px solid ${T.lava}`, padding:16, marginBottom:18 }}>
                <div style={{ ...fm, fontSize:9, letterSpacing:2, textTransform:'uppercase', color:T.ink3, marginBottom:8 }}>Add Note</div>
                <textarea
                  value={newNote} onChange={e => setNewNote(e.target.value)}
                  rows={4} placeholder="Write a note, update, or internal comment…"
                  style={{ width:'100%', background:T.surface2, border:`1px solid ${T.border}`, color:T.ink, padding:'9px 12px', fontSize:13, resize:'vertical', marginBottom:8, fontFamily:"'IBM Plex Sans',sans-serif" }}
                />
                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <input value={newAuthor} onChange={e => setNewAuthor(e.target.value)} placeholder="Your name" style={{ background:T.surface2, border:`1px solid ${T.border}`, color:T.ink, padding:'7px 10px', ...fm, fontSize:11, width:160 }} />
                  <button onClick={saveNote} style={{ background:T.lava, color:'#fff', border:'none', padding:'8px 16px', fontFamily:"'Syne',sans-serif", fontSize:12, fontWeight:700, letterSpacing:1, cursor:'pointer' }}>SAVE</button>
                  {noteSaved && <span style={{ ...fm, fontSize:11, color:T.green }}>✓ Saved</span>}
                </div>
              </div>
              {/* Notes list */}
              {notes.length === 0
                ? <div style={{ textAlign:'center', padding:'40px 20px', ...fm, fontSize:12, color:T.ink3 }}>No notes yet. Add the first one above.</div>
                : notes.map((n, i) => (
                    <div key={i} style={{ background:T.surface, border:`1px solid ${T.border}`, padding:'14px 16px', marginBottom:8 }}>
                      <div style={{ fontSize:13, lineHeight:1.7, color:T.ink, whiteSpace:'pre-wrap', marginBottom:8 }}>{n.text}</div>
                      <div style={{ ...fm, fontSize:10, color:T.ink3 }}>{n.author} · {n.date}</div>
                    </div>
                  ))
              }
            </div>
          )}

          {/* FILES TAB */}
          {activeTab === 'files' && (
            <div>
              {/* Drop zone */}
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={handleFileDrop}
                style={{ border:`2px dashed ${T.border}`, background:T.surface, padding:'28px 20px', textAlign:'center', marginBottom:18, cursor:'pointer' }}
              >
                <div style={{ fontSize:28, marginBottom:8 }}>📎</div>
                <div style={{ ...fm, fontSize:12, color:T.ink3, marginBottom:4 }}>Drag & drop files here</div>
                <div style={{ ...fm, fontSize:10, color:T.ink3 }}>Screenshots, logs, error exports, SOPs</div>
                <label style={{ display:'inline-block', marginTop:12, background:T.lava, color:'#fff', border:'none', padding:'7px 16px', fontFamily:"'Syne',sans-serif", fontSize:11, fontWeight:700, letterSpacing:1, cursor:'pointer' }}>
                  BROWSE
                  <input type="file" multiple onChange={e => {
                    const picked = Array.from(e.target.files);
                    const newFiles = picked.map(f => ({ name:f.name, size:`${(f.size/1024).toFixed(1)} KB`, date:'Just now', type:f.type }));
                    setFiles(prev => [...newFiles, ...prev]);
                    e.target.value = '';
                  }} style={{ display:'none' }} />
                </label>
              </div>
              {/* File list */}
              {files.length === 0
                ? <div style={{ textAlign:'center', padding:'30px 20px', ...fm, fontSize:12, color:T.ink3 }}>No files attached yet.</div>
                : files.map((f, i) => {
                    const ext = f.name.split('.').pop().toLowerCase();
                    const icon = ['png','jpg','jpeg','gif','webp'].includes(ext)?'🖼️':['pdf'].includes(ext)?'📄':['csv','xlsx'].includes(ext)?'📊':['mp4','mov'].includes(ext)?'🎬':'📎';
                    return (
                      <div key={i} style={{ background:T.surface, border:`1px solid ${T.border}`, padding:'12px 14px', marginBottom:8, display:'flex', alignItems:'center', gap:12 }}>
                        <span style={{ fontSize:20, flexShrink:0 }}>{icon}</span>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:13, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f.name}</div>
                          <div style={{ ...fm, fontSize:10, color:T.ink3, marginTop:2 }}>{f.size} · {f.date}</div>
                        </div>
                        <button onClick={() => setFiles(prev => prev.filter((_,j) => j !== i))} style={{ background:'none', border:'none', color:T.ink3, cursor:'pointer', fontSize:14, flexShrink:0 }}>✕</button>
                      </div>
                    );
                  })
              }
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Seed notes/files onto tickets for demo
const TICKET_SEEDS = {
  'TKT-0042': {
    notes:[
      { date:'May 29, 2026', author:'Priya S.', text:'Investigated Salesforce API rate limit. Webhook not registering on new lead creation. Suspect rate throttle on Salesforce sandbox tier. Escalating to Salesforce support.' },
      { date:'May 29, 2026', author:'Sam R.',   text:'Client flagged this as blocking their entire sales pipeline. Priority elevated to High. Need resolution by May 31.' },
    ],
    files:[
      { name:'salesforce_api_log_may29.csv', size:'14.2 KB', date:'May 29, 2026', type:'text/csv' },
      { name:'webhook_trace_screenshot.png', size:'88.4 KB', date:'May 29, 2026', type:'image/png' },
    ],
  },
  'TKT-0040': {
    notes:[
      { date:'May 27, 2026', author:'Priya S.', text:'Duplicate records traced to import mapping — contact ID field not deduplicating on re-import. Fix in progress, testing on staging.' },
    ],
    files:[
      { name:'duplicate_contacts_export.xlsx', size:'22.1 KB', date:'May 27, 2026', type:'application/xlsx' },
    ],
  },
  'TKT-0039': {
    notes:[
      { date:'May 26, 2026', author:'Alex M.', text:'Slack webhook credential expired. Rotation request sent to client — waiting on them to regenerate and share.' },
      { date:'May 26, 2026', author:'Darek C.', text:'Notified Jane Smith. She will handle credential rotation and reply by May 28.' },
    ],
    files:[],
  },
  'TKT-0034': {
    notes:[
      { date:'May 19, 2026', author:'Priya S.', text:'Step 3 of email sequence has a conditional branch that is not resolving correctly after the "Lead Qualified" trigger. Reviewing logic tree.' },
    ],
    files:[
      { name:'email_sequence_flow_diagram.pdf', size:'156 KB', date:'May 19, 2026', type:'application/pdf' },
    ],
  },
};

// Merge seeds into tickets
const TICKETS_WITH_DATA = ALL_TICKETS.map(t => ({
  ...t,
  notes: TICKET_SEEDS[t.id]?.notes || [],
  files: TICKET_SEEDS[t.id]?.files || [],
}));

function TicketCard({ t, onClick }) {
  const bc = {High:T.red, Medium:'#D4A017', Low:T.green};
  const pclass = {High:'pr', Medium:'py', Low:'pg'};
  const devInit = (t.dev || '').split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
  const stageColor = TKT_STAGE_COLORS[t.stage] || T.ink3;
  const noteCount = t.notes?.length || 0;
  const fileCount = t.files?.length || 0;
  return (
    <div onClick={onClick} style={{ background:T.surface, border:`1px solid ${T.border}`, borderLeft:`3px solid ${bc[t.sev]||T.border2}`, padding:'13px 15px', marginBottom:8, cursor:'pointer', transition:'box-shadow .15s' }}
      onMouseOver={e => e.currentTarget.style.boxShadow='0 2px 10px rgba(0,0,0,.08)'}
      onMouseOut={e => e.currentTarget.style.boxShadow='none'}
    >
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:6, marginBottom:3 }}>
        <div style={{ ...fm, fontSize:10, color:T.ink3 }}>#{t.id} · {t.acct}</div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {(noteCount > 0 || fileCount > 0) && (
            <div style={{ display:'flex', gap:8 }}>
              {noteCount > 0 && <span style={{ ...fm, fontSize:9, color:T.ink3 }}>💬 {noteCount}</span>}
              {fileCount > 0 && <span style={{ ...fm, fontSize:9, color:T.ink3 }}>📎 {fileCount}</span>}
            </div>
          )}
          {t.dev && (
            <div style={{ display:'flex', alignItems:'center', gap:5 }}>
              <div style={{ width:20, height:20, background:T.dark, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontFamily:"'Syne',sans-serif", fontSize:8, fontWeight:700, flexShrink:0 }}>{devInit}</div>
              <span style={{ ...fm, fontSize:10, color:T.ink3 }}>{t.dev}</span>
            </div>
          )}
        </div>
      </div>
      <div style={{ fontSize:14, fontWeight:500, marginBottom:6 }}>{t.title}</div>
      <div style={{ display:'flex', gap:10, flexWrap:'wrap', ...fm, fontSize:10, color:T.ink3, alignItems:'center' }}>
        <Pill type={pclass[t.sev]}>{t.sev}</Pill>
        <span style={{ display:'inline-block', padding:'1px 6px', ...fm, fontSize:9, border:'1px solid', color:stageColor, background:stageColor+'18', borderColor:stageColor+'44' }}>{t.stage}</span>
        <span>{t.type}</span>
        <span>{t.date}</span>
        {t.pm && <span>PM: {t.pm}</span>}
        {t.resolved && <span style={{ color:T.green }}>✓ Resolved: {t.resolved}</span>}
      </div>
    </div>
  );
}

function TicketKanbanCard({ t, onClick }) {
  const bc = {High:T.red, Medium:'#D4A017', Low:T.green};
  const pclass = {High:'pr', Medium:'py', Low:'pg'};
  const devInit = (t.dev || '').split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
  const noteCount = t.notes?.length || 0;
  const fileCount = t.files?.length || 0;
  return (
    <div onClick={onClick} style={{ background:T.surface, border:`1px solid ${T.border}`, borderLeft:`3px solid ${bc[t.sev]||T.border2}`, padding:'11px 12px', marginBottom:8, cursor:'pointer', transition:'box-shadow .15s' }}
      onMouseOver={e => e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,.1)'}
      onMouseOut={e => e.currentTarget.style.boxShadow='none'}
    >
      <div style={{ ...fm, fontSize:10, color:T.ink3, marginBottom:4 }}>#{t.id} · {t.acct}</div>
      <div style={{ fontSize:12, fontWeight:600, lineHeight:1.4, marginBottom:8 }}>{t.title}</div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:4 }}>
        <Pill type={pclass[t.sev]}>{t.sev}</Pill>
        {t.dev && (
          <div style={{ display:'flex', alignItems:'center', gap:5 }}>
            <div style={{ width:18, height:18, background:T.dark, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontFamily:"'Syne',sans-serif", fontSize:7, fontWeight:700, flexShrink:0 }}>{devInit}</div>
            <span style={{ ...fm, fontSize:9, color:T.ink3 }}>{t.dev}</span>
          </div>
        )}
      </div>
      <div style={{ ...fm, fontSize:9, color:T.ink3, marginTop:6, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span>{t.date} · {t.pm}</span>
        {(noteCount > 0 || fileCount > 0) && (
          <span style={{ display:'flex', gap:6 }}>
            {noteCount > 0 && <span>💬 {noteCount}</span>}
            {fileCount > 0 && <span>📎 {fileCount}</span>}
          </span>
        )}
      </div>
    </div>
  );
}

function TicketsPage({ supabase }) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [devFilter, setDevFilter]       = useState('all');
  const [view, setView]                 = useState('list');
  const [openTicket, setOpenTicket]     = useState(null);
  const [rows, setRows] = useState([]);

  // Real tickets from Supabase (RLS-filtered). dev = assignee, stage = status
  // relabeled to the board columns, account/PM resolved by id. notes/files/type
  // have no schema home yet, so they stay empty (no fabricated data).
  useEffect(() => {
    let alive = true;
    (async () => {
      const fmt = (x) => x ? new Date(x).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
      const sev = { H: 'High', M: 'Medium', L: 'Low' };
      const stageOf = { open: 'New', in_progress: 'In Progress', waiting: 'Waiting on Client', resolved: 'Completed' };
      const statusOf = { open: 'open', in_progress: 'in-progress', waiting: 'waiting', resolved: 'resolved' };
      const [tk, accts, emps] = await Promise.all([
        supabase.from('tickets').select('ticket_id,account_id,title,priority,status,assigned_to,created_at,resolved_at').order('created_at', { ascending: false }),
        supabase.from('accounts').select('account_id,pm_id,hubspot_company_id'),
        supabase.from('employees').select('id,name'),
      ]);
      if (!alive) return;
      const empName = Object.fromEntries((emps.data || []).map(e => [e.id, e.name]));
      const compIds = [...new Set((accts.data || []).map(a => a.hubspot_company_id).filter(Boolean))];
      let compName = {};
      if (compIds.length) { const { data: cs } = await supabase.from('hubspot_companies').select('id,name').in('id', compIds); compName = Object.fromEntries((cs || []).map(c => [c.id, c.name])); }
      const acctInfo = Object.fromEntries((accts.data || []).map(a => [a.account_id, { name: compName[a.hubspot_company_id] || '—', pm: empName[a.pm_id] || '' }]));
      const out = (tk.data || []).map(t => ({
        id: String(t.ticket_id).slice(0, 8),
        acct: acctInfo[t.account_id]?.name || '—',
        title: t.title,
        sev: sev[t.priority] || t.priority,
        status: statusOf[t.status] || t.status,
        stage: stageOf[t.status] || '',
        type: '',
        date: fmt(t.created_at),
        pm: acctInfo[t.account_id]?.pm || '',
        dev: t.assigned_to ? (empName[t.assigned_to] || '') : '',
        resolved: t.resolved_at ? fmt(t.resolved_at) : undefined,
        notes: [], files: [],
      }));
      setRows(out);
    })();
    return () => { alive = false; };
  }, [supabase]);

  const devNames = [...new Set(rows.map(t => t.dev).filter(Boolean))];

  const shown = rows.filter(t => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (devFilter !== 'all' && t.dev !== devFilter) return false;
    return true;
  });

  const openCount    = rows.filter(t => t.status === 'open' || t.status === 'in-progress').length;
  const resolvedCount = rows.filter(t => t.status === 'resolved').length;
  const selStyle = { background:T.surface, border:`1px solid ${T.border}`, color:T.ink, padding:'6px 12px', ...fm, fontSize:11, cursor:'pointer' };
  const statusBtns = ['all','open','in-progress','resolved'];

  const viewBtnStyle = (active) => ({
    background: active ? T.lava : T.surface,
    border: 'none',
    borderLeft: `1px solid ${T.border}`,
    color: active ? '#fff' : T.ink3,
    padding: '7px 14px',
    ...fm, fontSize:11, letterSpacing:1, cursor:'pointer',
    display:'flex', alignItems:'center', gap:6,
  });

  return (
    <div className="page-enter">
      {openTicket && <TicketDetail ticket={openTicket} onClose={() => setOpenTicket(null)} />}

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:10, marginBottom:16 }}>
        <div>
          <h2 style={{ ...fd, fontSize:28, fontWeight:800 }}>Support Tickets</h2>
          <p style={{ ...fm, fontSize:11, color:T.ink3, marginTop:3 }}>{openCount} open · {resolvedCount} resolved this month</p>
        </div>
        <div style={{ display:'flex', border:`1px solid ${T.border}`, overflow:'hidden', alignSelf:'center' }}>
          <button onClick={() => setView('list')} style={{ ...viewBtnStyle(view==='list'), borderLeft:'none' }}>
            <svg width="12" height="10" viewBox="0 0 12 10" fill="currentColor"><rect y="0" width="12" height="2"/><rect y="4" width="12" height="2"/><rect y="8" width="12" height="2"/></svg>
            List
          </button>
          <button onClick={() => setView('bydev')} style={viewBtnStyle(view==='bydev')}>
            <svg width="12" height="10" viewBox="0 0 12 10" fill="currentColor"><rect x="0" y="0" width="3" height="10"/><rect x="5" y="0" width="3" height="7"/><rect x="9" y="0" width="3" height="10"/></svg>
            By Dev
          </button>
          <button onClick={() => setView('pipeline')} style={viewBtnStyle(view==='pipeline')}>
            <svg width="12" height="10" viewBox="0 0 12 10" fill="currentColor"><rect x="0" y="0" width="2" height="10"/><rect x="3" y="0" width="2" height="10"/><rect x="6" y="0" width="2" height="10"/><rect x="9" y="0" width="2" height="10"/></svg>
            Pipeline
          </button>
        </div>
      </div>

      {/* Filter bar */}
      {view !== 'pipeline' && (
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center', marginBottom:18 }}>
          <div style={{ display:'flex', gap:6 }}>
            {statusBtns.map(f => (
              <button key={f} onClick={() => setStatusFilter(f)} style={{ background:statusFilter===f?T.lava:'none', border:`1px solid ${statusFilter===f?T.lava:T.border}`, color:statusFilter===f?'#fff':T.ink2, ...fm, fontSize:11, padding:'5px 12px', cursor:'pointer' }}>
                {f==='in-progress'?'In Progress':f.charAt(0).toUpperCase()+f.slice(1)}
              </button>
            ))}
          </div>
          <select value={devFilter} onChange={e => setDevFilter(e.target.value)} style={selStyle}>
            <option value="all">All Dev Members</option>
            {devNames.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          {(statusFilter !== 'all' || devFilter !== 'all') && (
            <button onClick={() => { setStatusFilter('all'); setDevFilter('all'); }} style={{ background:'none', border:`1px solid ${T.border}`, color:T.ink3, ...fm, fontSize:11, padding:'5px 12px', cursor:'pointer' }}>Clear</button>
          )}
          <span style={{ ...fm, fontSize:11, color:T.ink3 }}>{shown.length} ticket{shown.length !== 1 ? 's' : ''}</span>
        </div>
      )}

      {/* LIST VIEW */}
      {view === 'list' && (
        <div>{shown.map(t => <TicketCard key={t.id} t={t} onClick={() => setOpenTicket(t)} />)}</div>
      )}

      {/* BY DEV VIEW */}
      {view === 'bydev' && (
        <div>
          {devNames.map(devName => {
            const devTickets = shown.filter(t => t.dev === devName);
            const openDev = devTickets.filter(t => t.status === 'open' || t.status === 'in-progress').length;
            const init = devName.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
            return (
              <div key={devName} style={{ marginBottom:28 }}>
                <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', background:T.surface, border:`1px solid ${T.border}`, borderTop:`3px solid ${T.dark}`, marginBottom:10 }}>
                  <div style={{ width:40, height:40, background:T.dark, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontFamily:"'Syne',sans-serif", fontSize:15, fontWeight:700, flexShrink:0 }}>{init}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:15, fontWeight:700 }}>{devName}</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ ...fd, fontSize:28, fontWeight:800, color: openDev > 0 ? T.red : T.green, lineHeight:1 }}>{openDev}</div>
                    <div style={{ ...fm, fontSize:9, color:T.ink3, letterSpacing:1, textTransform:'uppercase', marginTop:2 }}>Open</div>
                  </div>
                  <div style={{ textAlign:'right', marginLeft:16 }}>
                    <div style={{ ...fd, fontSize:28, fontWeight:800, color:T.ink, lineHeight:1 }}>{devTickets.length}</div>
                    <div style={{ ...fm, fontSize:9, color:T.ink3, letterSpacing:1, textTransform:'uppercase', marginTop:2 }}>Total</div>
                  </div>
                </div>
                {devTickets.length
                  ? devTickets.map(t => <TicketCard key={t.id} t={t} onClick={() => setOpenTicket(t)} />)
                  : <div style={{ background:T.surface, border:`1px dashed ${T.border}`, padding:'18px 16px', ...fm, fontSize:12, color:T.ink3 }}>No tickets match current filters.</div>
                }
              </div>
            );
          })}
        </div>
      )}

      {/* PIPELINE VIEW */}
      {view === 'pipeline' && (
        <div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center', marginBottom:18 }}>
            <select value={devFilter} onChange={e => setDevFilter(e.target.value)} style={selStyle}>
              <option value="all">All Dev Members</option>
              {DEV_MEMBERS.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
            </select>
            {devFilter !== 'all' && (
              <button onClick={() => setDevFilter('all')} style={{ background:'none', border:`1px solid ${T.border}`, color:T.ink3, ...fm, fontSize:11, padding:'5px 12px', cursor:'pointer' }}>Clear</button>
            )}
          </div>
          <div style={{ overflowX:'auto', paddingBottom:16, minHeight:400 }}>
            <div style={{ display:'flex', gap:12, minWidth:'max-content', alignItems:'flex-start' }}>
              {TKT_PIPELINE_STAGES.map(stage => {
                const stageColor = TKT_STAGE_COLORS[stage];
                const stageTickets = rows.filter(t => {
                  if (devFilter !== 'all' && t.dev !== devFilter) return false;
                  return t.stage === stage;
                });
                return (
                  <div key={stage} style={{ width:260, flexShrink:0 }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'11px 14px', background:T.surface, border:`1px solid ${T.border}`, borderTop:`3px solid ${stageColor}`, marginBottom:10, position:'sticky', top:0, zIndex:2 }}>
                      <span style={{ ...fm, fontSize:10, letterSpacing:2, textTransform:'uppercase', color:T.ink, fontWeight:700 }}>{stage}</span>
                      <span style={{ ...fm, fontSize:11, fontWeight:700, color:stageColor, background:stageColor+'18', border:`1px solid ${stageColor}44`, padding:'1px 8px' }}>{stageTickets.length}</span>
                    </div>
                    {stageTickets.length
                      ? stageTickets.map(t => <TicketKanbanCard key={t.id} t={t} onClick={() => setOpenTicket(t)} />)
                      : <div style={{ background:T.surface, border:`1px dashed ${T.border}`, padding:'28px 12px', textAlign:'center', ...fm, fontSize:11, color:T.ink3, letterSpacing:1 }}>Empty</div>
                    }
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MeetingsPage({ session, supabase }) {
  const me = session?.employee || null;
  const [meetings, setMeetings] = useState([]);
  const fmt = (x) => x ? new Date(x).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
  useEffect(() => {
    let alive = true;
    (async () => {
      const [mRes, accRes, empRes] = await Promise.all([
        supabase.from('meetings').select('meeting_id,account_id,type,title,status,meeting_date,meeting_time,scheduled_minutes,contact,notes').order('meeting_date', { ascending: true }),
        supabase.from('accounts').select('account_id,pm_id,hubspot_company_id'),
        supabase.from('employees').select('id,name'),
      ]);
      if (!alive) return;
      const empName = Object.fromEntries((empRes.data || []).map(e => [e.id, e.name]));
      const compIds = [...new Set((accRes.data || []).map(a => a.hubspot_company_id).filter(Boolean))];
      let compName = {};
      if (compIds.length) { const { data: cs } = await supabase.from('hubspot_companies').select('id,name').in('id', compIds); compName = Object.fromEntries((cs || []).map(c => [c.id, c.name])); }
      const acctInfo = Object.fromEntries((accRes.data || []).map(a => [a.account_id, { name: compName[a.hubspot_company_id] || '—', pm: empName[a.pm_id] || '' }]));
      setMeetings((mRes.data || []).map(m => ({
        id: m.meeting_id,
        title: m.title || m.type || 'Meeting',
        type: m.type || '',
        acct: acctInfo[m.account_id]?.name || '—',
        pm: acctInfo[m.account_id]?.pm || '',
        contact: m.contact || '',
        date: fmt(m.meeting_date),
        time: m.meeting_time || '',
        duration: m.scheduled_minutes ? `${m.scheduled_minutes} min` : '',
        notes: m.notes || '',
        status: m.status || 'pending',
      })));
    })();
    return () => { alive = false; };
  }, [supabase]);

  const pending = meetings.filter(m => m.status === 'pending' || m.status === 'scheduled');
  const confirmed = meetings.filter(m => m.status === 'confirmed');

  async function handleMtg(id, action) {
    const status = action === 'confirmed' ? 'confirmed' : 'declined';
    const { error } = await supabase.from('meetings').update({ status }).eq('meeting_id', id);
    if (error) return;
    const m = meetings.find(x => x.id === id);
    await logActivity({ app: 'portal', actor: me, action: `portal.meeting.${status}`, entityType: 'meeting', entityId: id, details: { title: m?.title } });
    setMeetings(prev => prev.map(x => x.id === id ? { ...x, status } : x));
  }

  return (
    <div className="page-enter">
      <div style={{ marginBottom:22 }}><h2 style={{ ...fd, fontSize:28, fontWeight:800 }}>Meeting Requests</h2><p style={{ ...fm, fontSize:11, color:T.ink3, marginTop:3 }}>{pending.length} pending · {confirmed.length} confirmed</p></div>
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, padding:18, marginBottom:14 }}>
        <div style={{ ...fm, fontSize:10, letterSpacing:3, textTransform:'uppercase', color:T.ink3, marginBottom:12 }}>Pending Confirmation</div>
        {pending.length === 0 && <div style={{ ...fm, fontSize:12, color:T.ink3 }}>No pending meeting requests.</div>}
        {pending.map(m => (
          <div key={m.id} style={{ background:T.surface2, border:`1px solid ${T.border}`, borderLeft:`3px solid ${T.border2}`, padding:14, marginBottom:8 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:8 }}>
              <div>
                <div style={{ fontSize:13, fontWeight:600, marginBottom:3 }}>{m.title}</div>
                <div style={{ ...fm, fontSize:11, color:T.ink3 }}>{[m.contact, m.date, m.time, m.duration].filter(Boolean).join(' · ')}</div>
                {m.notes && <div style={{ fontSize:12, color:T.ink2, marginTop:5 }}>{m.notes}</div>}
              </div>
              <div style={{ display:'flex', gap:6 }}>
                <button onClick={() => handleMtg(m.id,'confirmed')} style={{ background:T.lava, color:'#fff', border:'none', padding:'6px 12px', ...fd, fontSize:11, fontWeight:700, cursor:'pointer' }}>Confirm</button>
                <button onClick={() => handleMtg(m.id,'declined')} style={{ background:'none', border:`1px solid ${T.border}`, color:T.ink2, ...fm, fontSize:11, padding:'6px 12px', cursor:'pointer' }}>Decline</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, padding:18 }}>
        <div style={{ ...fm, fontSize:10, letterSpacing:3, textTransform:'uppercase', color:T.ink3, marginBottom:12 }}>Confirmed Upcoming</div>
        <table className="tbl"><thead><tr><th>Account</th><th>Type</th><th>Date & Time</th><th>Requestor</th><th>PM</th><th>Status</th></tr></thead>
        <tbody>{confirmed.map((c) => <tr key={c.id}><td>{c.acct}</td><td>{c.type}</td><td style={{...fm,fontSize:12}}>{[c.date, c.time].filter(Boolean).join(' · ')}</td><td>{c.contact}</td><td>{c.pm}</td><td><Pill type="pg">Confirmed</Pill></td></tr>)}</tbody></table>
        {confirmed.length === 0 && <div style={{ ...fm, fontSize:12, color:T.ink3, marginTop:8 }}>No confirmed meetings.</div>}
      </div>
    </div>
  );
}

function CommsPage() {
  const [type, setType] = useState('');
  const [recip, setRecip] = useState('All Active Clients');
  const [subj, setSubj] = useState('');
  const [body, setBody] = useState('');
  const [sender, setSender] = useState('LAVA Automation Team');
  const [sent, setSent] = useState(false);
  const TPLS = {
    phase:{type:'Announcement — Milestone / Launch',subj:'Phase [N] Complete — [Next Phase] Begins [Date]',body:'Phase [N] has been completed and signed off.\n\nAll deliverables passed quality review. Phase [N+1] kicks off on [Date].\n\nNo action required from your team.'},
    maint:{type:'Operational Notice — Maintenance / Policy',subj:'Scheduled Maintenance — [Date], [Time] CST',body:'Maintenance on [Date] from [Start] to [End] CST.\n\nAffected: [Systems]\nImpact: [Description]'},
    train:{type:'Training Notice — Module Release',subj:'New Training Module — Module [N]: [Title]',body:'Module [N]: [Title] is now available in your portal.\n\nEstimated time: [X] min. Please complete by [Deadline].'},
    alert:{type:'Alert — Action Required',subj:'ACTION REQUIRED — [Description]',body:'Action required before [Deadline].\n\n[Issue description]\n\nRequired steps: [Steps]\n\nContact [PM] at [email] with questions.'},
  };
  const selStyle = { width:'100%', background:T.surface2, border:`1px solid ${T.border}`, color:T.ink, padding:'10px 12px', ...fb, fontSize:13, marginBottom:14 };
  const sent_msgs = [
    {c:'la',text:<><strong>Announcement</strong> → All: "Phase 2 Complete"</>,sub:'Apr 28 · Darek C.'},
    {c:'b',text:<><strong>Update</strong> → Acme: "HubSpot Testing Complete"</>,sub:'Apr 22 · Dev Team'},
    {c:'y',text:<><strong>Operational</strong> → All: "Maintenance Apr 20"</>,sub:'Apr 15 · Ops'},
    {c:'g',text:<><strong>Training</strong> → All: "Module 6 Released"</>,sub:'Apr 10 · Training'},
  ];
  const dotC = {la:T.lava,b:T.blue,y:'#D4A017',g:T.green};
  return (
    <div className="page-enter">
      <div style={{ marginBottom:22 }}><h2 style={{ ...fd, fontSize:28, fontWeight:800 }}>Send Communication</h2><p style={{ ...fm, fontSize:11, color:T.ink3, marginTop:3 }}>Broadcast updates, announcements, or notices to clients</p></div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, padding:18 }}>
          <div style={{ ...fm, fontSize:10, letterSpacing:3, textTransform:'uppercase', color:T.ink3, marginBottom:12 }}>Compose</div>
          {sent && <div style={{ background:T.greenBg, border:`1px solid ${T.green}`, color:T.green, padding:'10px 14px', ...fm, fontSize:12, marginBottom:14 }}>✓ Communication sent successfully.</div>}
          <label style={{ ...fm, fontSize:10, letterSpacing:2, textTransform:'uppercase', color:T.ink3, display:'block', marginBottom:5 }}>Message Type</label>
          <select value={type} onChange={e => setType(e.target.value)} style={selStyle}><option value="">— Select type —</option><option>Update — Project Progress</option><option>Announcement — Milestone / Launch</option><option>Operational Notice — Maintenance / Policy</option><option>Alert — Action Required</option><option>Training Notice — Module Release</option></select>
          <label style={{ ...fm, fontSize:10, letterSpacing:2, textTransform:'uppercase', color:T.ink3, display:'block', marginBottom:5 }}>Recipient(s)</label>
          <select value={recip} onChange={e => setRecip(e.target.value)} style={selStyle}><option>All Active Clients</option><option>Acme Corp</option><option>TechNova Inc</option><option>Meridian Group</option><option>Skyline Ventures</option><option>Blueridge Digital</option><option>Coral Dynamics</option></select>
          <label style={{ ...fm, fontSize:10, letterSpacing:2, textTransform:'uppercase', color:T.ink3, display:'block', marginBottom:5 }}>Subject / Title</label>
          <input value={subj} onChange={e => setSubj(e.target.value)} placeholder="e.g. Phase 3 Kickoff — May 1, 2026" style={{ ...selStyle }} />
          <label style={{ ...fm, fontSize:10, letterSpacing:2, textTransform:'uppercase', color:T.ink3, display:'block', marginBottom:5 }}>Message Body</label>
          <textarea value={body} onChange={e => setBody(e.target.value)} rows={6} placeholder="Write your message here…" style={{ ...selStyle, resize:'vertical' }} />
          <label style={{ ...fm, fontSize:10, letterSpacing:2, textTransform:'uppercase', color:T.ink3, display:'block', marginBottom:5 }}>Send As</label>
          <select value={sender} onChange={e => setSender(e.target.value)} style={selStyle}><option>LAVA Automation Team</option><option>Darek C. — Project Manager</option><option>Sam R. — Project Manager</option><option>Victoria S. — Project Manager</option><option>LAVA Ops</option></select>
          <button onClick={() => { if(!type||!subj||!body){alert('Fill in Type, Subject, and Message.');return;} setSent(true); setType(''); setSubj(''); setBody(''); setTimeout(()=>setSent(false),5000); }} style={{ background:T.lava, color:'#fff', border:'none', padding:'10px 22px', ...fd, fontSize:15, fontWeight:700, letterSpacing:2, cursor:'pointer', marginRight:8 }}>SEND</button>
          <button onClick={() => { setType(''); setSubj(''); setBody(''); }} style={{ background:'none', border:`1px solid ${T.border}`, color:T.ink2, padding:'10px 22px', ...fd, fontSize:15, fontWeight:700, letterSpacing:2, cursor:'pointer' }}>CLEAR</button>
        </div>
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, padding:18 }}>
          <div style={{ ...fm, fontSize:10, letterSpacing:3, textTransform:'uppercase', color:T.ink3, marginBottom:12 }}>Templates</div>
          <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:18 }}>
            {[['phase','📋 Phase Completion Announcement'],['maint','⚙️ Maintenance Notice'],['train','📚 Training Module Release'],['alert','🚨 Action Required Alert']].map(([k,lbl]) => (
              <button key={k} onClick={() => { const t=TPLS[k]; setType(t.type); setSubj(t.subj); setBody(t.body); }} style={{ background:'none', border:`1px solid ${T.border}`, color:T.ink2, padding:'8px 12px', ...fb, fontSize:12, cursor:'pointer', textAlign:'left' }}>{lbl}</button>
            ))}
          </div>
          <div style={{ ...fm, fontSize:10, letterSpacing:3, textTransform:'uppercase', color:T.ink3, marginBottom:12 }}>Recent Sent</div>
          {sent_msgs.map((m,i) => (
            <div key={i} style={{ display:'flex', gap:10, padding:'11px 0', borderBottom: i<sent_msgs.length-1?`1px solid ${T.border}`:'none' }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:dotC[m.c], marginTop:5, flexShrink:0 }} />
              <div><div style={{ fontSize:13, lineHeight:1.5 }}>{m.text}</div><div style={{ ...fm, fontSize:10, color:T.ink3, marginTop:2 }}>{m.sub}</div></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DocsPage() {
  const cats = [
    {cat:'Onboarding',icon:'📋',items:[{name:'Client Onboarding Checklist',desc:'Step-by-step checklist for new account setup'},{name:'Welcome Packet — Client Version',desc:'Branded welcome document sent to new clients'},{name:'LAVA Platform Overview (PDF)',desc:'Overview of all LAVA automation services'}]},
    {cat:'SOPs & Workflows',icon:'⚙️',items:[{name:'Lead Routing SOP',desc:'Standard operating procedure for lead assignment'},{name:'Email Sequence Setup Guide',desc:'How to configure and launch drip campaigns'},{name:'CRM Integration Playbook',desc:'Step-by-step CRM connection and field mapping'},{name:'VA Task Management SOP',desc:'Daily workflow and task handling for VAs'}]},
    {cat:'Training Materials',icon:'📚',items:[{name:'VA Training Module Index',desc:'Full list of all 8 training modules with links'},{name:'Platform Walkthrough (Recording)',desc:'Video walkthrough of client portal features'},{name:'HubSpot Basics for VAs',desc:'Getting started guide for VA HubSpot usage'}]},
    {cat:'Contracts & Billing',icon:'📄',items:[{name:'Master Service Agreement',desc:'Signed MSA on file for this account'},{name:'Scope of Work',desc:'Current SOW document for active engagement'},{name:'Invoice History',desc:'Billing records and payment history'}]},
    {cat:'Templates',icon:'🗂️',items:[{name:'Client Update Email Template',desc:'Standardized template for project updates'},{name:'Meeting Agenda Template',desc:'Pre-built agenda for recurring check-ins'},{name:'Escalation Notice Template',desc:'Template for urgent client communications'}]},
  ];
  return (
    <div className="page-enter">
      <div style={{ marginBottom:22 }}><h2 style={{ ...fd, fontSize:28, fontWeight:800 }}>LAVA Docs</h2><p style={{ ...fm, fontSize:11, color:T.ink3, marginTop:3 }}>Internal document library — SOPs, templates, training, and more</p></div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:14 }}>
        {cats.map(cat => (
          <div key={cat.cat} style={{ background:T.surface, border:`1px solid ${T.border}` }}>
            <div style={{ padding:'12px 16px', borderBottom:`1px solid ${T.border}`, display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:16 }}>{cat.icon}</span>
              <span style={{ ...fm, fontSize:10, letterSpacing:2, textTransform:'uppercase', color:T.ink3 }}>{cat.cat}</span>
            </div>
            {cat.items.map(doc => (
              <div key={doc.name} style={{ padding:'11px 16px', borderBottom:`1px solid ${T.border}`, display:'flex', alignItems:'flex-start', gap:10 }}>
                <div style={{ flex:1 }}>
                  <a href="#" style={{ fontSize:13, fontWeight:500, color:T.blue, textDecoration:'none', display:'block', marginBottom:2 }}>{doc.name}</a>
                  <div style={{ ...fm, fontSize:10, color:T.ink3 }}>{doc.desc}</div>
                </div>
                <span style={{ ...fm, fontSize:10, color:T.ink3, flexShrink:0, paddingTop:2 }}>↗</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function TrainersContent({ supabase }) {
  const [trainers, setTrainers] = useState([]);
  useEffect(() => {
    let alive = true;
    (async () => {
      const init = (n) => (n || '?').split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
      const colors = ['#1A5FAA', '#6A3A9A', '#1D7A4F', '#8B4513', '#145365', '#AA4A1A'];
      const pick = (n) => colors[(n || '?').charCodeAt(0) % colors.length];
      const [vasRes, empRes, accRes, trRes, tsRes] = await Promise.all([
        supabase.from('vas').select('employee_id,account_id,title,status,mods_done,mods_total,dev_trainer_id,ins_trainer_id'),
        supabase.from('employees').select('id,name,position,email'),
        supabase.from('accounts').select('account_id,hubspot_company_id'),
        supabase.from('trainers').select('employee_id,specialty,capacity'),
        supabase.from('training_sessions').select('trainer_id'),
      ]);
      if (!alive) return;
      const emp = Object.fromEntries((empRes.data || []).map(e => [e.id, e]));
      const trMeta = Object.fromEntries((trRes.data || []).map(t => [t.employee_id, t]));
      const compIds = [...new Set((accRes.data || []).map(a => a.hubspot_company_id).filter(Boolean))];
      let compName = {};
      if (compIds.length) { const { data: cs } = await supabase.from('hubspot_companies').select('id,name').in('id', compIds); compName = Object.fromEntries((cs || []).map(c => [c.id, c.name])); }
      const acctComp = Object.fromEntries((accRes.data || []).map(a => [a.account_id, compName[a.hubspot_company_id] || '—']));
      const vlist = vasRes.data || [];
      const ids = new Set((trRes.data || []).map(t => t.employee_id));
      vlist.forEach(v => { if (v.dev_trainer_id) ids.add(v.dev_trainer_id); if (v.ins_trainer_id) ids.add(v.ins_trainer_id); });
      const rows = [...ids].map(id => {
        const name = emp[id]?.name || 'Unknown';
        const assignedVAs = vlist.filter(v => v.dev_trainer_id === id || v.ins_trainer_id === id).map(v => ({
          id: v.employee_id, av: init(emp[v.employee_id]?.name), bg: pick(emp[v.employee_id]?.name || '?'),
          name: emp[v.employee_id]?.name || 'Unknown', title: v.title || 'VA',
          account: v.account_id ? (acctComp[v.account_id] || '—') : '—',
          status: v.status || 'onboarding', modsDone: v.mods_done ?? 0, modsTotal: v.mods_total ?? 0,
        }));
        const capacity = trMeta[id]?.capacity ?? 0;
        const assigned = assignedVAs.length;
        const workload = capacity ? Math.min(100, Math.round((assigned / capacity) * 100)) : 0;
        return { id, av: init(name), bg: pick(name), name, title: emp[id]?.position || 'Trainer', email: emp[id]?.email || '', specialty: trMeta[id]?.specialty || '', capacity, assigned, workload, assignedVAs };
      });
      setTrainers(rows);
    })();
    return () => { alive = false; };
  }, [supabase]);
  const wC = (w) => w>=90?T.red:w>=60?'#D4A017':T.green;
  const wL = (w) => w>=90?'At Capacity':w>=60?'Moderate':'Available';
  const mC = (done,tot) => tot && done===tot?T.green:done>=5?'#D4A017':T.red;
  return trainers.map(t => {
        const assignedVAs = t.assignedVAs;
        return (
          <div key={t.name} style={{ background:T.surface2, border:`1px solid ${T.border}`, marginBottom:18 }}>
            <div style={{ padding:'18px 20px', borderBottom:`2px solid ${T.border}`, display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' }}>
              <Avatar av={t.av} bg={t.bg} size={48} />
              <div style={{ flex:1 }}>
                <div style={{ fontSize:15, fontWeight:700 }}>{t.name}</div>
                <div style={{ ...fm, fontSize:10, color:T.ink3, marginTop:2 }}>{t.title}</div>
                <div style={{ ...fm, fontSize:11, color:T.blue, marginTop:3 }}>{t.email}</div>
                <div style={{ ...fm, fontSize:10, color:T.ink3, marginTop:3 }}>Specialty: {t.specialty}</div>
              </div>
              <div style={{ textAlign:'right', minWidth:120 }}>
                <div style={{ ...fd, fontSize:36, fontWeight:800, color:wC(t.workload), lineHeight:1 }}>{t.workload}%</div>
                <div style={{ ...fm, fontSize:10, color:T.ink3, marginTop:2 }}>Workload</div>
                <div style={{ height:5, background:T.surface2, border:`1px solid ${T.border}`, width:120, marginTop:5 }}>
                  <div style={{ width:`${t.workload}%`, height:'100%', background:wC(t.workload) }} />
                </div>
                <div style={{ ...fm, fontSize:10, color:wC(t.workload), marginTop:3 }}>{wL(t.workload)} · {t.assigned}/{t.capacity} slots</div>
              </div>
            </div>
            <div style={{ padding:'10px 16px 6px', ...fm, fontSize:9, letterSpacing:3, textTransform:'uppercase', color:T.ink3 }}>Assigned VAs</div>
            {assignedVAs.map(v => {
              const mc = mC(v.modsDone, v.modsTotal);
              const modPct = v.modsTotal ? Math.round((v.modsDone/v.modsTotal)*100) : 0;
              const sc = v.status==='active'?'pg':v.status==='training'?'py':'pb';
              return (
                <div key={v.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderBottom:`1px solid ${T.border}`, background:T.surface }}>
                  <Avatar av={v.av} bg={v.bg} size={34} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:600 }}>{v.name} <span style={{ ...fm, fontSize:10, color:T.ink3, marginLeft:8 }}>{v.title}</span></div>
                    <div style={{ ...fm, fontSize:10, color:T.ink3, margin:'3px 0' }}>{v.account}</div>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:5 }}>
                      <div style={{ width:100, height:5, background:T.surface2, border:`1px solid ${T.border}`, flexShrink:0 }}>
                        <div style={{ width:`${modPct}%`, height:'100%', background:mc }} />
                      </div>
                      <span style={{ ...fm, fontSize:10, color:T.ink3 }}>{v.modsDone}/{v.modsTotal} modules</span>
                    </div>
                  </div>
                  <Pill type={sc}>{v.status.charAt(0).toUpperCase()+v.status.slice(1)}</Pill>
                </div>
              );
            })}
          </div>
        );
      });
};

function VAOverviewPage({ supabase }) {
  const [vaFilter, setVaFilter] = useState('all');
  const [vas, setVas] = useState([]);
  useEffect(() => {
    let alive = true;
    (async () => {
      const fmt = (x) => x ? new Date(x).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
      const init = (n) => (n || '?').split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
      const colors = ['#1A5FAA', '#6A3A9A', '#1D7A4F', '#8B4513', '#145365', '#AA4A1A', '#2A7A4F', '#B07D10'];
      const pick = (n) => colors[(n || '?').charCodeAt(0) % colors.length];
      const [vasRes, empRes, accRes] = await Promise.all([
        supabase.from('vas').select('employee_id,account_id,title,status,started_at,dev_trainer_id,ins_trainer_id,task_comp,tasks_run,mods_done,mods_total,bio,skills,issues'),
        supabase.from('employees').select('id,name,position'),
        supabase.from('accounts').select('account_id,hubspot_company_id'),
      ]);
      if (!alive) return;
      const emp = Object.fromEntries((empRes.data || []).map(e => [e.id, e]));
      const compIds = [...new Set((accRes.data || []).map(a => a.hubspot_company_id).filter(Boolean))];
      let compName = {};
      if (compIds.length) { const { data: cs } = await supabase.from('hubspot_companies').select('id,name').in('id', compIds); compName = Object.fromEntries((cs || []).map(c => [c.id, c.name])); }
      const acctComp = Object.fromEntries((accRes.data || []).map(a => [a.account_id, compName[a.hubspot_company_id] || '—']));
      const rows = (vasRes.data || []).map(v => {
        const name = emp[v.employee_id]?.name || 'Unknown';
        const trainerId = v.dev_trainer_id || v.ins_trainer_id;
        return {
          id: v.employee_id,
          av: init(name), bg: pick(name),
          name,
          title: v.title || emp[v.employee_id]?.position || 'VA',
          status: v.status || 'onboarding',
          account: v.account_id ? (acctComp[v.account_id] || '—') : '—',
          trainer: trainerId ? (emp[trainerId]?.name || '—') : '—',
          startDate: fmt(v.started_at),
          taskComp: v.task_comp ?? 0,
          tasksRun: v.tasks_run ?? 0,
          modsDone: v.mods_done ?? 0,
          modsTotal: v.mods_total ?? 0,
          bio: v.bio || '',
          skills: v.skills || [],
          issues: v.issues || [],
        };
      });
      setVas(rows);
    })();
    return () => { alive = false; };
  }, [supabase]);
  const filteredVAs = vaFilter === 'all' ? vas : vas.filter(v => v.status === vaFilter);
  return (
    <div className="page-enter">
      <div style={{ marginBottom:22 }}><h2 style={{ ...fd, fontSize:28, fontWeight:800 }}>VA Overview</h2><p style={{ ...fm, fontSize:11, color:T.ink3, marginTop:3 }}>VA profiles across all accounts</p></div>
      <div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:18 }}>
            {['all','active','training','onboarding'].map(f => (
              <button key={f} onClick={() => setVaFilter(f)} style={{ background: vaFilter===f?T.lava:'none', border:`1px solid ${vaFilter===f?T.lava:T.border}`, color: vaFilter===f?'#fff':T.ink2, ...fm, fontSize:11, padding:'5px 12px', cursor:'pointer' }}>{f.charAt(0).toUpperCase()+f.slice(1)}</button>
            ))}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))', gap:14 }}>
            {filteredVAs.map(v => {
              const sc = v.status==='active'?'pg':v.status==='training'?'py':'pb';
              const modPct = v.modsTotal ? Math.round((v.modsDone/v.modsTotal)*100) : 0;
              const mc = v.modsDone===v.modsTotal?T.green:v.modsDone>=5?'#D4A017':T.red;
              const tc = v.taskComp>=90?T.green:v.taskComp>=70?'#D4A017':T.red;
              return (
                <div key={v.id} style={{ background:T.surface, border:`1px solid ${T.border}` }}>
                  <div style={{ padding:'16px 18px', borderBottom:`1px solid ${T.border}`, display:'flex', alignItems:'center', gap:12 }}>
                    <Avatar av={v.av} bg={v.bg} size={44} />
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:14, fontWeight:700 }}>{v.name}</div>
                      <div style={{ ...fm, fontSize:10, color:T.ink3, marginTop:2 }}>{v.title} · Since {v.startDate}</div>
                    </div>
                    <Pill type={sc}>{v.status.charAt(0).toUpperCase()+v.status.slice(1)}</Pill>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', borderBottom:`1px solid ${T.border}` }}>
                    {[{v:v.taskComp+'%',l:'TASK COMP.',c:tc},{v:v.tasksRun.toLocaleString(),l:'TASKS RUN',c:T.ink},{v:`${v.modsDone}/${v.modsTotal}`,l:'MODULES',c:T.ink}].map((s,i) => (
                      <div key={i} style={{ padding:'12px 14px', textAlign:'center', borderRight: i<2?`1px solid ${T.border}`:'none' }}>
                        <div style={{ ...fd, fontSize:24, fontWeight:800, color:s.c }}>{s.v}</div>
                        <div style={{ ...fm, fontSize:9, color:T.ink3, letterSpacing:1, marginTop:2 }}>{s.l}</div>
                      </div>
                    ))}
                  </div>
                  {[{l:'Account',v:v.account},{l:'Trainer',v:v.trainer}].map(f => (
                    <div key={f.l} style={{ padding:'14px 18px', borderBottom:`1px solid ${T.border}` }}>
                      <div style={{ ...fm, fontSize:10, letterSpacing:2, color:T.ink3, textTransform:'uppercase', marginBottom:4 }}>{f.l}</div>
                      <div style={{ fontSize:13 }}>{f.v}</div>
                    </div>
                  ))}
                  <div style={{ padding:'14px 18px', borderBottom:`1px solid ${T.border}` }}>
                    <div style={{ display:'flex', justifyContent:'space-between', ...fm, fontSize:10, color:T.ink3, marginBottom:5 }}><span style={{ letterSpacing:2, textTransform:'uppercase' }}>Training Progress</span><span>{modPct}%</span></div>
                    <div style={{ height:6, background:T.surface2, border:`1px solid ${T.border}` }}><div style={{ width:`${modPct}%`, height:'100%', background:mc }} /></div>
                  </div>
                  <div style={{ padding:'14px 18px', borderBottom:`1px solid ${T.border}` }}>
                    <div style={{ ...fm, fontSize:10, letterSpacing:2, color:T.ink3, textTransform:'uppercase', marginBottom:5 }}>Bio</div>
                    <div style={{ fontSize:12, color:T.ink2, lineHeight:1.6 }}>{v.bio}</div>
                  </div>
                  <div style={{ padding:'14px 18px', borderBottom:`1px solid ${T.border}` }}>
                    <div style={{ ...fm, fontSize:10, letterSpacing:2, color:T.ink3, textTransform:'uppercase', marginBottom:7 }}>Skills</div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>{v.skills.map(s => <span key={s} style={{ background:T.surface2, border:`1px solid ${T.border}`, padding:'2px 9px', ...fm, fontSize:10, color:T.ink2 }}>{s}</span>)}</div>
                  </div>
                  <div style={{ padding:'14px 18px' }}>
                    <div style={{ ...fm, fontSize:10, letterSpacing:2, color:T.ink3, textTransform:'uppercase', marginBottom:7 }}>Issues / Notes</div>
                    {v.issues.length ? v.issues.map((iss,i) => (
                      <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:7, padding:'6px 0', borderBottom:`1px solid ${T.border}` }}>
                        <span style={{ color:T.yellow, flexShrink:0, marginTop:1 }}>⚠</span>
                        <span style={{ fontSize:12, color:T.ink2 }}>{iss}</span>
                      </div>
                    )) : <div style={{ fontSize:12, color:T.green, ...fm }}>✓ No issues</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
    </div>
  );
}

function LAVATrainersPage({ supabase }) {
  return (
    <div className="page-enter">
      <div style={{ marginBottom:22 }}><h2 style={{ ...fd, fontSize:28, fontWeight:800 }}>LAVA Trainers</h2><p style={{ ...fm, fontSize:11, color:T.ink3, marginTop:3 }}>Trainer workloads and assigned VAs</p></div>
      <TrainersContent supabase={supabase} />
    </div>
  );
}

function ComingSoonPage({ title, icon, desc }) {
  return (
    <div className="page-enter" style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'80px 20px', textAlign:'center' }}>
      <div style={{ fontSize:48, marginBottom:18 }}>{icon}</div>
      <div style={{ ...fd, fontSize:28, fontWeight:800, color:T.ink, marginBottom:10 }}>{title}</div>
      <div style={{ ...fm, fontSize:12, color:T.ink3, letterSpacing:1, maxWidth:400, lineHeight:1.7 }}>{desc}</div>
      <div style={{ marginTop:24, ...fm, fontSize:11, color:T.ink3, background:T.surface, border:`1px solid ${T.border}`, padding:'8px 20px' }}>Coming Soon</div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  ROOT APP
// ─────────────────────────────────────────────
export default function App({ session, supabase, navigate }) {
  const me = session?.employee || null;
  const [page, setPage] = useState('dashboard');
  const [openAcctId, setOpenAcctId] = useState(null);
  const [openAcctTab, setOpenAcctTab] = useState(null);

  // Accounts come from Supabase (RLS-filtered), shaped to match what the
  // Dashboard and Accounts views already expect. Deeper per-account detail
  // tabs still read mock data in this pass.
  const [accounts, setAccounts] = useState([]);
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: accts, error } = await supabase
        .from('accounts')
        .select('account_id, fulfillment, cs_status, stage, since_date, hubspot_company_id, pm_id');
      if (error || !accts) { if (alive) setAccounts([]); return; }
      const companyIds = [...new Set(accts.map(a => a.hubspot_company_id).filter(Boolean))];
      const pmIds = [...new Set(accts.map(a => a.pm_id).filter(Boolean))];
      const [companiesRes, pmsRes, ticketsRes] = await Promise.all([
        companyIds.length ? supabase.from('hubspot_companies').select('id,name').in('id', companyIds) : Promise.resolve({ data: [] }),
        pmIds.length ? supabase.from('employees').select('id,name').in('id', pmIds) : Promise.resolve({ data: [] }),
        supabase.from('tickets').select('account_id,status'),
      ]);
      const companyName = Object.fromEntries((companiesRes.data || []).map(c => [c.id, c.name]));
      const pmName = Object.fromEntries((pmsRes.data || []).map(p => [p.id, p.name]));
      const openByAcct = {};
      (ticketsRes.data || []).forEach(t => { if (t.status !== 'resolved') openByAcct[t.account_id] = (openByAcct[t.account_id] || 0) + 1; });
      const monthYear = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '';
      const rows = accts.map(a => ({
        id: a.account_id,
        name: companyName[a.hubspot_company_id] || 'Unknown agency',
        pm: pmName[a.pm_id] || '—',
        fulfillment: a.fulfillment || '—',
        csStatus: a.cs_status || 'New',
        stage: a.stage || 'Onboarding',
        since: monthYear(a.since_date),
        tix: openByAcct[a.account_id] || 0,
        pct: 0, // no progress column in the schema yet (bend-to-schema)
      }));
      if (alive) setAccounts(rows);
    })();
    return () => { alive = false; };
  }, [supabase]);

  const navTo = (p) => { setPage(p); setOpenAcctId(null); setOpenAcctTab(null); };
  const openAcct = (id, tab) => { setOpenAcctId(id); setOpenAcctTab(tab || null); setPage('accounts'); };

  const PAGE_LABELS = { dashboard:'Dashboard', accounts:'Accounts', vaoverview:'VA Overview', lavatrainers:'LAVA Trainers', tickets:'Support Tickets', meetings:'Meeting Requests', comms:'Send Communication', docs:'LAVA Docs', incident:'Incident / Postmortem', brainsignals:'Brain Signals Composer', qalog:'QA Defect Log', crmcurriculum:'CRM Training Curriculum' };
  const SB_ITEMS = [
    { section:'Fulfillment Overview', items:[{page:'dashboard',label:'Dashboard',icon:'◈'},{page:'accounts',label:'Accounts',icon:'⬡',badge:12},{page:'vaoverview',label:'VA Overview',icon:'◉'}] },
    // Support Tickets is replaced by the standalone Dev Support app; QAQC gets
    // its own button. Both jump to their own routes via the shell's navigate().
    // LAVA Trainers and Meeting Requests stay as Portal pages for now.
    { section:'Dev Support', items:[{page:'lavatrainers',label:'LAVA Trainers',icon:'◆'},{route:'/dev-support',label:'Dev Support',icon:'◎'},{route:'/qaqc',label:'QAQC',icon:'◳'},{page:'meetings',label:'Meeting Requests',icon:'◷',badge:3}] },
    { section:'Tools', items:[{page:'incident',label:'Incident / Postmortem',icon:'◌'},{page:'brainsignals',label:'Brain Signals Composer',icon:'◍'},{page:'qalog',label:'QA Defect Log',icon:'◎'},{page:'crmcurriculum',label:'CRM Training Curriculum',icon:'◧'}] },
    { section:'Team', items:[{page:'comms',label:'Send Communication',icon:'◫'},{page:'docs',label:'LAVA Docs',icon:'◈'}] },
  ];

  const topTitle = openAcctId ? (accounts.find(a=>a.id===openAcctId)?.name || 'Account') : (PAGE_LABELS[page] || page);

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <div style={{ display:'flex', minHeight:'100vh' }}>
        {/* Sidebar */}
        <nav style={{ width:220, background:'#121210', color:'#999', display:'flex', flexDirection:'column', position:'sticky', top:0, height:'100vh', flexShrink:0, overflowY:'auto' }}>
          <div style={{ padding:20, borderBottom:'1px solid #222' }}>
            <div style={{ ...fd, fontSize:22, fontWeight:800, letterSpacing:2, color:'#F0EDE8' }}>L<span style={{ color:T.lava }}>A</span>VA</div>
            <div style={{ ...fm, fontSize:9, letterSpacing:2, color:'#444', marginTop:4 }}>Internal Operations</div>
          </div>
          {SB_ITEMS.map(section => (
            <div key={section.section}>
              <div style={{ ...fm, fontSize:9, letterSpacing:3, color:'#383835', textTransform:'uppercase', padding:'16px 20px 5px' }}>{section.section}</div>
              {section.items.map(item => (
                <button key={item.page || item.route} className={`sb-btn${item.page && page===item.page && !openAcctId?' on':''}`} onClick={() => item.route ? navigate(item.route) : navTo(item.page)}>
                  <span style={{ fontSize:13, width:18, textAlign:'center', flexShrink:0 }}>{item.icon}</span>
                  {item.label}
                  {item.badge && <span style={{ marginLeft:'auto', background:T.lava, color:'#fff', ...fm, fontSize:9, padding:'2px 6px', minWidth:18, textAlign:'center' }}>{item.badge}</span>}
                </button>
              ))}
            </div>
          ))}
          <div style={{ height:1, background:'#222', margin:'8px 0' }} />
          <div style={{ marginTop:'auto', padding:'14px 20px', borderTop:'1px solid #222', display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:30, height:30, background:T.lava, display:'flex', alignItems:'center', justifyContent:'center', ...fd, fontSize:13, fontWeight:700, color:'#fff' }}>{(me?.name || '?').charAt(0)}</div>
            <div style={{ minWidth:0, flex:1 }}>
              <div style={{ fontSize:12, color:'#CCC', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{me?.name || 'Unknown'}</div>
              <div style={{ ...fm, fontSize:10, color:'#666' }}>{me?.position || me?.department || ''}</div>
            </div>
          </div>
        </nav>

        {/* Main */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0 }}>
          <div style={{ background:T.surface, borderBottom:`1px solid ${T.border}`, padding:'0 24px', height:50, display:'flex', alignItems:'center', position:'sticky', top:0, zIndex:40 }}>
            <div style={{ ...fm, fontSize:11, color:T.ink3 }}>LAVA Internal / <strong style={{ color:T.ink }}>{topTitle}</strong></div>
          </div>
          <div style={{ flex:1, padding:24 }}>
            {page === 'dashboard'   && !openAcctId && <Dashboard onNav={navTo} onOpenAcct={openAcct} accounts={accounts} supabase={supabase} />}
            {page === 'accounts'    && !openAcctId && <AccountsPage onOpenAcct={openAcct} accounts={accounts} />}
            {page === 'accounts'    && openAcctId  && <AccountDetail acctId={openAcctId} accounts={accounts} supabase={supabase} onBack={() => { setOpenAcctId(null); setOpenAcctTab(null); }} initialTab={openAcctTab} />}
            {page === 'vaoverview'     && <VAOverviewPage supabase={supabase} />}
            {page === 'lavatrainers'   && <LAVATrainersPage supabase={supabase} />}
            {page === 'meetings'       && <MeetingsPage session={session} supabase={supabase} />}
            {page === 'comms'          && <CommsPage />}
            {page === 'docs'           && <DocsPage />}
            {page === 'incident'       && <ComingSoonPage title="Incident / Postmortem" icon="🚨" desc="Log and track incidents, outages, and post-mortem reviews." />}
            {page === 'brainsignals'   && <ComingSoonPage title="Brain Signals Composer" icon="🧠" desc="Compose and manage automated intelligence signals across accounts." />}
            {page === 'qalog'          && <ComingSoonPage title="QA Defect Log" icon="🔍" desc="Track quality assurance defects, test results, and resolution status." />}
            {page === 'crmcurriculum'  && <ComingSoonPage title="CRM Training Curriculum" icon="📚" desc="Manage and assign CRM training curriculum for VAs and staff." />}
          </div>
        </div>
      </div>
    </>
  );
}
