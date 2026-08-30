1:"$Sreact.fragment"
2:I[479520,["/_next/static/chunks/39iyiniitji8m.js","/_next/static/chunks/1ntn7efqc-iiw.js","/_next/static/chunks/2c5rvwq1ei0-i.js","/_next/static/chunks/1s50t5yz2fnzr.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/081f9uqhut_q2.js"],""]
a:I[168027,["/_next/static/chunks/39iyiniitji8m.js","/_next/static/chunks/1ntn7efqc-iiw.js","/_next/static/chunks/2c5rvwq1ei0-i.js","/_next/static/chunks/1s50t5yz2fnzr.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/081f9uqhut_q2.js"],"default",1]
:HL["/_next/static/chunks/15-5wcm-1grrv.css","style"]
3:Tc62,
              (function() {
                function sanitizeInput(el) {
                  if (!el) return;
                  if (el.tagName === 'FORM') {
                    el.setAttribute('autocomplete', 'off');
                    return;
                  }
                  if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    const isPasswordType = el.type === 'password';
                    if (!isPasswordType) {
                      el.setAttribute('autocomplete', 'off');
                      el.setAttribute('autocorrect', 'off');
                      el.setAttribute('autocapitalize', 'off');
                      el.setAttribute('spellcheck', 'false');
                      el.setAttribute('aria-autocomplete', 'none');
                      el.setAttribute('data-lpignore', 'true');
                      el.setAttribute('data-1p-ignore', 'true');
                      el.setAttribute('data-bwignore', 'true');
                      el.setAttribute('data-bitwarden-watching', 'false');
                      
                      const nameOrPlaceholder = (el.name || el.placeholder || el.id || '').toLowerCase();
                      if (nameOrPlaceholder.includes('mobile') || nameOrPlaceholder.includes('phone') || nameOrPlaceholder.includes('aadhaar') || nameOrPlaceholder.includes('account') || nameOrPlaceholder.includes('amount') || nameOrPlaceholder.includes('pincode') || nameOrPlaceholder.includes('pin') || nameOrPlaceholder.includes('otp')) {
                        if (!el.hasAttribute('inputmode')) {
                          el.setAttribute('inputmode', 'numeric');
                        }
                      }
                    }
                  }
                }

                function processAll() {
                  document.querySelectorAll('form').forEach(sanitizeInput);
                  document.querySelectorAll('input, textarea').forEach(sanitizeInput);
                }

                if (document.readyState === 'loading') {
                  document.addEventListener('DOMContentLoaded', processAll);
                } else {
                  processAll();
                }

                document.addEventListener('focusin', function(e) { sanitizeInput(e.target); }, true);
                document.addEventListener('click', function(e) { sanitizeInput(e.target); }, true);
                document.addEventListener('touchstart', function(e) { sanitizeInput(e.target); }, true);

                var observer = new MutationObserver(function(mutations) {
                  mutations.forEach(function(mutation) {
                    mutation.addedNodes.forEach(function(node) {
                      if (node.nodeType === 1) {
                        sanitizeInput(node);
                        if (node.querySelectorAll) {
                          node.querySelectorAll('form, input, textarea').forEach(sanitizeInput);
                        }
                      }
                    });
                  });
                });
                observer.observe(document.documentElement, { childList: true, subtree: true });
              })();
            0:{"P":null,"c":["","distributor","login"],"q":"","i":false,"f":[[["",{"children":["distributor",{"children":["login",{"children":["__PAGE__",{}]}]}]},"$undefined","$undefined",16],[["$","$1","c",{"children":[[["$","link","0",{"rel":"stylesheet","href":"/_next/static/chunks/15-5wcm-1grrv.css","precedence":"next","crossOrigin":"$undefined","nonce":"$undefined"}],["$","script","script-0",{"src":"/_next/static/chunks/39iyiniitji8m.js","async":true,"nonce":"$undefined"}],["$","script","script-1",{"src":"/_next/static/chunks/1ntn7efqc-iiw.js","async":true,"nonce":"$undefined"}],["$","script","script-2",{"src":"/_next/static/chunks/2c5rvwq1ei0-i.js","async":true,"nonce":"$undefined"}],["$","script","script-3",{"src":"/_next/static/chunks/1s50t5yz2fnzr.js","async":true,"nonce":"$undefined"}],["$","script","script-4",{"src":"/_next/static/chunks/3aiu8uhh9ykx9.js","async":true,"nonce":"$undefined"}],["$","script","script-5",{"src":"/_next/static/chunks/081f9uqhut_q2.js","async":true,"nonce":"$undefined"}]],["$","html",null,{"lang":"en","className":"dark","suppressHydrationWarning":true,"style":{"overflowX":"hidden","maxWidth":"100vw"},"children":["$","body",null,{"className":"antialiased min-h-screen bg-slate-950 text-slate-100","suppressHydrationWarning":true,"style":{"overflowX":"hidden","maxWidth":"100vw"},"children":[["$","$L2",null,{"id":"form-input-sanitizer","strategy":"afterInteractive","dangerouslySetInnerHTML":{"__html":"$3"}}],"$L4"]}]}]]}],{"children":["$L5",{"children":["$L6",{"children":["$L7",{},null,false,null]},null,false,"$@8"]},null,false,"$@8"]},null,false,null],"$L9",false]],"m":"$undefined","G":["$a",["$Lb"]],"S":true,"h":null,"s":"$undefined","l":"$undefined","p":"$undefined","d":"$undefined","b":"2wFblw0ifYlcXw1UugM7A"}
c:I[544636,["/_next/static/chunks/39iyiniitji8m.js","/_next/static/chunks/1ntn7efqc-iiw.js","/_next/static/chunks/2c5rvwq1ei0-i.js","/_next/static/chunks/1s50t5yz2fnzr.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/081f9uqhut_q2.js"],"default"]
d:I[339756,["/_next/static/chunks/39iyiniitji8m.js","/_next/static/chunks/1ntn7efqc-iiw.js","/_next/static/chunks/2c5rvwq1ei0-i.js","/_next/static/chunks/1s50t5yz2fnzr.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/081f9uqhut_q2.js"],"default"]
e:I[837457,["/_next/static/chunks/39iyiniitji8m.js","/_next/static/chunks/1ntn7efqc-iiw.js","/_next/static/chunks/2c5rvwq1ei0-i.js","/_next/static/chunks/1s50t5yz2fnzr.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/081f9uqhut_q2.js"],"default"]
f:I[329306,["/_next/static/chunks/39iyiniitji8m.js","/_next/static/chunks/1ntn7efqc-iiw.js","/_next/static/chunks/2c5rvwq1ei0-i.js","/_next/static/chunks/1s50t5yz2fnzr.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/081f9uqhut_q2.js","/_next/static/chunks/390xthzerc20i.js","/_next/static/chunks/1gzmmyyov0nu_.js"],"default"]
10:I[505014,["/_next/static/chunks/39iyiniitji8m.js","/_next/static/chunks/1ntn7efqc-iiw.js","/_next/static/chunks/2c5rvwq1ei0-i.js","/_next/static/chunks/1s50t5yz2fnzr.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/081f9uqhut_q2.js","/_next/static/chunks/37asd_m7j2qhf.js","/_next/static/chunks/1ghkha5bylp-5.js"],"default"]
11:I[110655,["/_next/static/chunks/39iyiniitji8m.js","/_next/static/chunks/1ntn7efqc-iiw.js","/_next/static/chunks/2c5rvwq1ei0-i.js","/_next/static/chunks/1s50t5yz2fnzr.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/081f9uqhut_q2.js","/_next/static/chunks/37asd_m7j2qhf.js","/_next/static/chunks/1ghkha5bylp-5.js"],"AuthPanel"]
12:I[897367,["/_next/static/chunks/39iyiniitji8m.js","/_next/static/chunks/1ntn7efqc-iiw.js","/_next/static/chunks/2c5rvwq1ei0-i.js","/_next/static/chunks/1s50t5yz2fnzr.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/081f9uqhut_q2.js"],"OutletBoundary"]
13:"$Sreact.suspense"
16:I[897367,["/_next/static/chunks/39iyiniitji8m.js","/_next/static/chunks/1ntn7efqc-iiw.js","/_next/static/chunks/2c5rvwq1ei0-i.js","/_next/static/chunks/1s50t5yz2fnzr.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/081f9uqhut_q2.js"],"ViewportBoundary"]
18:I[897367,["/_next/static/chunks/39iyiniitji8m.js","/_next/static/chunks/1ntn7efqc-iiw.js","/_next/static/chunks/2c5rvwq1ei0-i.js","/_next/static/chunks/1s50t5yz2fnzr.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/081f9uqhut_q2.js"],"MetadataBoundary"]
4:["$","$Lc",null,{"children":["$","$Ld",null,{"parallelRouterKey":"children","error":"$undefined","errorStyles":"$undefined","errorScripts":"$undefined","template":["$","$Le",null,{}],"templateStyles":"$undefined","templateScripts":"$undefined","notFound":[["$","$Lf",null,{}],[]],"forbidden":"$undefined","unauthorized":"$undefined"}]}]
5:["$","$1","c",{"children":[null,["$","$Ld",null,{"parallelRouterKey":"children","error":"$undefined","errorStyles":"$undefined","errorScripts":"$undefined","template":["$","$Le",null,{}],"templateStyles":"$undefined","templateScripts":"$undefined","notFound":"$undefined","forbidden":"$undefined","unauthorized":"$undefined"}]]}]
6:["$","$1","c",{"children":[null,["$","$Ld",null,{"parallelRouterKey":"children","error":"$undefined","errorStyles":"$undefined","errorScripts":"$undefined","template":["$","$Le",null,{}],"templateStyles":"$undefined","templateScripts":"$undefined","notFound":"$undefined","forbidden":"$undefined","unauthorized":"$undefined"}]]}]
7:["$","$1","c",{"children":[["$","div",null,{"className":"min-h-screen bg-[#0B0F19] text-white flex flex-col justify-between overflow-x-hidden relative select-none","children":[["$","div",null,{"className":"absolute top-0 left-1/4 w-96 h-96 bg-amber-600/15 rounded-full filter blur-[120px] pointer-events-none"}],["$","div",null,{"className":"absolute bottom-0 right-1/4 w-96 h-96 bg-yellow-500/15 rounded-full filter blur-[120px] pointer-events-none"}],["$","main",null,{"className":"flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-center py-6","children":["$","div",null,{"className":"grid grid-cols-1 lg:grid-cols-12 gap-8 items-center w-full","children":[["$","div",null,{"className":"hidden lg:flex lg:col-span-6 flex-col justify-center space-y-6 pr-4","children":[["$","div",null,{"className":"inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/80 w-fit backdrop-blur-md","children":[["$","$L10",null,{"ref":"$undefined","iconNode":[["path",{"d":"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z","key":"oel41y"}],["path",{"d":"m9 12 2 2 4-4","key":"dzmm74"}]],"className":"lucide-shield-check w-4 h-4 text-amber-400"}],["$","span",null,{"className":"text-xs font-semibold text-slate-300","children":"Distributor Network Management Portal"}]]}],["$","div",null,{"className":"space-y-3","children":[["$","h1",null,{"className":"text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-tight","children":["Distributor Operations ",["$","br",null,{}],["$","span",null,{"className":"bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-200 bg-clip-text text-transparent","children":"Management Console"}]]}],["$","p",null,{"className":"text-sm text-slate-400 leading-relaxed max-w-md","children":"Manage retailer networks, monitor daily transaction volumes, disburse commissions, and track channel growth in real time."}]]}],["$","div",null,{"className":"grid grid-cols-2 gap-3 pt-2","children":[["$","div",null,{"className":"p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md flex items-start gap-3","children":[["$","div",null,{"className":"p-2 rounded-xl bg-amber-500/10 text-amber-400 shrink-0","children":["$","$L10",null,{"ref":"$undefined","iconNode":[["path",{"d":"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2","key":"1yyitq"}],["path",{"d":"M16 3.128a4 4 0 0 1 0 7.744","key":"16gr8j"}],["path",{"d":"M22 21v-2a4 4 0 0 0-3-3.87","key":"kshegd"}],["circle",{"cx":"9","cy":"7","r":"4","key":"nufk8"}]],"className":"lucide-users w-4 h-4"}]}],["$","div",null,{"children":[["$","h4",null,{"className":"text-xs font-bold text-white","children":"Retailer Onboarding"}],["$","p",null,{"className":"text-[11px] text-slate-400","children":"Instant agent KYC & activation"}]]}]]}],["$","div",null,{"className":"p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md flex items-start gap-3","children":[["$","div",null,{"className":"p-2 rounded-xl bg-yellow-500/10 text-yellow-400 shrink-0","children":["$","$L10",null,{"ref":"$undefined","iconNode":[["path",{"d":"M16 7h6v6","key":"box55l"}],["path",{"d":"m22 7-8.5 8.5-5-5L2 17","key":"1t1m79"}]],"className":"lucide-trending-up w-4 h-4"}]}],["$","div",null,{"children":[["$","h4",null,{"className":"text-xs font-bold text-white","children":"Commission Engine"}],["$","p",null,{"className":"text-[11px] text-slate-400","children":"Automated real-time margin splits"}]]}]]}]]}]]}],["$","div",null,{"className":"lg:col-span-6 flex justify-center w-full","children":["$","div",null,{"className":"w-full max-w-md","children":["$","$L11",null,{"portalRole":"DISTRIBUTOR"}]}]}]]}]}]]}],[["$","script","script-0",{"src":"/_next/static/chunks/37asd_m7j2qhf.js","async":true,"nonce":"$undefined"}],["$","script","script-1",{"src":"/_next/static/chunks/1ghkha5bylp-5.js","async":true,"nonce":"$undefined"}]],["$","$L12",null,{"children":["$","$13",null,{"name":"Next.MetadataOutlet","children":"$@14"}]}]]}]
15:[]
8:"$W15"
9:["$","$1","h",{"children":[null,["$","$L16",null,{"children":"$L17"}],["$","div",null,{"hidden":true,"children":["$","$L18",null,{"children":["$","$13",null,{"name":"Next.Metadata","children":"$L19"}]}]}],null]}]
b:["$","link","0",{"rel":"stylesheet","href":"/_next/static/chunks/15-5wcm-1grrv.css","precedence":"next","crossOrigin":"$undefined","nonce":"$undefined"}]
17:[["$","meta","0",{"charSet":"utf-8"}],["$","meta","1",{"name":"viewport","content":"width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"}]]
1a:I[27201,["/_next/static/chunks/39iyiniitji8m.js","/_next/static/chunks/1ntn7efqc-iiw.js","/_next/static/chunks/2c5rvwq1ei0-i.js","/_next/static/chunks/1s50t5yz2fnzr.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/081f9uqhut_q2.js"],"IconMark"]
14:null
19:[["$","title","0",{"children":"Pay2Pay FinTech Retailer Platform"}],["$","meta","1",{"name":"description","content":"Enterprise Merchant Banking & Settlement Terminal"}],["$","link","2",{"rel":"manifest","href":"/site.webmanifest","crossOrigin":"$undefined"}],["$","link","3",{"rel":"shortcut icon","href":"/favicon.ico"}],["$","link","4",{"rel":"icon","href":"/favicon.ico?favicon.0dkwhtzwty2vg.ico","sizes":"256x256","type":"image/x-icon"}],["$","link","5",{"rel":"icon","href":"/favicon.ico"}],["$","link","6",{"rel":"icon","href":"/icon.png","type":"image/png"}],["$","link","7",{"rel":"icon","href":"/favicon-32x32.png","sizes":"32x32","type":"image/png"}],["$","link","8",{"rel":"icon","href":"/favicon-16x16.png","sizes":"16x16","type":"image/png"}],["$","link","9",{"rel":"apple-touch-icon","href":"/apple-touch-icon.png"}],["$","$L1a","10",{}]]
