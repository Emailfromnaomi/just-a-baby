/* Just a Baby: shared sign-up and log-in page logic.
 *
 * Both pages use the same email sign-in as the app: Supabase emails a link and
 * a 6-digit code, no passwords. The page's <body data-mode> picks the flavour:
 *   signup  creates the account if it's new (and signs in if it already exists)
 *   login   never creates an account, so a typo can't start a new household
 * Once signed in, people land on /yourbaby/.
 */
(function(){
'use strict';
const MODE=document.body.dataset.mode==='login'?'login':'signup';
const CFG=window.JAB_CONFIG||{};
const APP='/yourbaby/';
const INVITE_KEY='jab-invite';
const $=s=>document.querySelector(s);

function lsGet(k,fb){try{const v=localStorage.getItem(k);return v==null?fb:JSON.parse(v)}catch(_){return fb}}
function lsSet(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(_){}}

// An invite can arrive on this page's URL too (?invite=...). Keep it for the app.
const params=new URLSearchParams(location.search);
if(params.get('invite')){lsSet(INVITE_KEY,params.get('invite'));params.delete('invite');history.replaceState(null,'',location.pathname+(params.toString()?'?'+params:''))}
const invite=lsGet(INVITE_KEY,null);
if(invite&&MODE==='signup'){
  $('#heading').textContent='Someone wants backup.';
  $('#intro').textContent='Sign up with your email to join their household. No password needed.';
}

if(!CFG.supabaseUrl||!window.supabase){location.replace(APP);return}
const sb=window.supabase.createClient(CFG.supabaseUrl,CFG.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});

// Already signed in? Skip straight to the baby.
sb.auth.getSession().then(({data})=>{if(data&&data.session)location.replace(APP)});
sb.auth.onAuthStateChange((ev,session)=>{if(session&&ev==='SIGNED_IN')setTimeout(()=>location.replace(APP),0)});

function friendly(err){
  const m=(err&&(err.message||err.error_description||err.code))||'';
  if(/signups? not allowed|otp_disabled|user not found/i.test(m))return 'NO_ACCOUNT';
  if(/rate limit|too many|over_email_send_rate/i.test(m))return 'Too many tries. Wait a minute, then try again.';
  return 'That didn’t send. Check your connection and try again.';
}
function showErr(text){
  const box=$('#authErr');
  if(text==='NO_ACCOUNT'){
    box.innerHTML='We don’t have a household for that email. <a href="/signup/">Sign up instead</a>.';
  }else box.textContent=text;
}

let pendingEmail='';
$('#emailForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const email=$('#email').value.trim();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){showErr('Enter your email address, like name@example.com.');return}
  const btn=$('#emailBtn');btn.disabled=true;$('#authErr').textContent='';
  const redirect=location.origin+APP+(invite?'?invite='+encodeURIComponent(invite):'');
  const {error}=await sb.auth.signInWithOtp({email,options:{emailRedirectTo:redirect,shouldCreateUser:MODE==='signup'}});
  btn.disabled=false;
  if(error){showErr(friendly(error));return}
  pendingEmail=email;
  $('#sentTo').textContent=`We sent a link and a code to ${email}. Open the link on this device, or type the code below.`;
  $('#emailForm').hidden=true;$('#codeForm').hidden=false;$('#otp').value='';$('#otp').focus();
});

$('#codeForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const token=$('#otp').value.replace(/\D/g,'');
  if(token.length<6){showErr('The code is 6 digits.');return}
  const btn=$('#codeBtn');btn.disabled=true;$('#authErr').textContent='';
  const {error}=await sb.auth.verifyOtp({email:pendingEmail,token,type:'email'});
  if(error){btn.disabled=false;showErr('That code didn’t work. Check the latest email, or send a new link.');return}
  location.replace(APP);
});

$('#changeEmail').addEventListener('click',()=>{$('#emailForm').hidden=false;$('#codeForm').hidden=true;$('#authErr').textContent='';$('#email').focus()});
})();
