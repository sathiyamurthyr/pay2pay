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
            0:{"P":null,"c":["","sd","login"],"q":"","i":false,"f":[[["",{"children":["sd",{"children":["login",{"children":["__PAGE__",{}]}]}]},"$undefined","$undefined",16],[["$","$1","c",{"children":[[["$","link","0",{"rel":"stylesheet","href":"/_next/static/chunks/15-5wcm-1grrv.css","precedence":"next","crossOrigin":"$undefined","nonce":"$undefined"}],["$","script","script-0",{"src":"/_next/static/chunks/39iyiniitji8m.js","async":true,"nonce":"$undefined"}],["$","script","script-1",{"src":"/_next/static/chunks/1ntn7efqc-iiw.js","async":true,"nonce":"$undefined"}],["$","script","script-2",{"src":"/_next/static/chunks/2c5rvwq1ei0-i.js","async":true,"nonce":"$undefined"}],["$","script","script-3",{"src":"/_next/static/chunks/1s50t5yz2fnzr.js","async":true,"nonce":"$undefined"}],["$","script","script-4",{"src":"/_next/static/chunks/3aiu8uhh9ykx9.js","async":true,"nonce":"$undefined"}],["$","script","script-5",{"src":"/_next/static/chunks/081f9uqhut_q2.js","async":true,"nonce":"$undefined"}]],["$","html",null,{"lang":"en","className":"dark","suppressHydrationWarning":true,"style":{"overflowX":"hidden","maxWidth":"100vw"},"children":["$","body",null,{"className":"antialiased min-h-screen bg-slate-950 text-slate-100","suppressHydrationWarning":true,"style":{"overflowX":"hidden","maxWidth":"100vw"},"children":[["$","$L2",null,{"id":"form-input-sanitizer","strategy":"afterInteractive","dangerouslySetInnerHTML":{"__html":"$3"}}],"$L4"]}]}]]}],{"children":["$L5",{"children":["$L6",{"children":["$L7",{},null,false,null]},null,false,"$@8"]},null,false,"$@8"]},null,false,null],"$L9",false]],"m":"$undefined","G":["$a",["$Lb"]],"S":true,"h":null,"s":"$undefined","l":"$undefined","p":"$undefined","d":"$undefined","b":"2wFblw0ifYlcXw1UugM7A"}
c:I[544636,["/_next/static/chunks/39iyiniitji8m.js","/_next/static/chunks/1ntn7efqc-iiw.js","/_next/static/chunks/2c5rvwq1ei0-i.js","/_next/static/chunks/1s50t5yz2fnzr.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/081f9uqhut_q2.js"],"default"]
d:I[339756,["/_next/static/chunks/39iyiniitji8m.js","/_next/static/chunks/1ntn7efqc-iiw.js","/_next/static/chunks/2c5rvwq1ei0-i.js","/_next/static/chunks/1s50t5yz2fnzr.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/081f9uqhut_q2.js"],"default"]
e:I[837457,["/_next/static/chunks/39iyiniitji8m.js","/_next/static/chunks/1ntn7efqc-iiw.js","/_next/static/chunks/2c5rvwq1ei0-i.js","/_next/static/chunks/1s50t5yz2fnzr.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/081f9uqhut_q2.js"],"default"]
f:I[329306,["/_next/static/chunks/39iyiniitji8m.js","/_next/static/chunks/1ntn7efqc-iiw.js","/_next/static/chunks/2c5rvwq1ei0-i.js","/_next/static/chunks/1s50t5yz2fnzr.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/081f9uqhut_q2.js","/_next/static/chunks/390xthzerc20i.js","/_next/static/chunks/1gzmmyyov0nu_.js"],"default"]
10:I[505014,["/_next/static/chunks/39iyiniitji8m.js","/_next/static/chunks/1ntn7efqc-iiw.js","/_next/static/chunks/2c5rvwq1ei0-i.js","/_next/static/chunks/1s50t5yz2fnzr.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/081f9uqhut_q2.js","/_next/static/chunks/37asd_m7j2qhf.js","/_next/static/chunks/1ghkha5bylp-5.js"],"default"]
11:I[110655,["/_next/static/chunks/39iyiniitji8m.js","/_next/static/chunks/1ntn7efqc-iiw.js","/_next/static/chunks/2c5rvwq1ei0-i.js","/_next/static/chunks/1s50t5yz2fnzr.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/081f9uqhut_q2.js","/_next/static/chunks/37asd_m7j2qhf.js","/_next/static/chunks/1ghkha5bylp-5.js"],"AuthPanel"]
15:I[897367,["/_next/static/chunks/39iyiniitji8m.js","/_next/static/chunks/1ntn7efqc-iiw.js","/_next/static/chunks/2c5rvwq1ei0-i.js","/_next/static/chunks/1s50t5yz2fnzr.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/081f9uqhut_q2.js"],"ViewportBoundary"]
17:I[897367,["/_next/static/chunks/39iyiniitji8m.js","/_next/static/chunks/1ntn7efqc-iiw.js","/_next/static/chunks/2c5rvwq1ei0-i.js","/_next/static/chunks/1s50t5yz2fnzr.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/081f9uqhut_q2.js"],"MetadataBoundary"]
18:"$Sreact.suspense"
4:["$","$Lc",null,{"children":["$","$Ld",null,{"parallelRouterKey":"children","error":"$undefined","errorStyles":"$undefined","errorScripts":"$undefined","template":["$","$Le",null,{}],"templateStyles":"$undefined","templateScripts":"$undefined","notFound":[["$","$Lf",null,{}],[]],"forbidden":"$undefined","unauthorized":"$undefined"}]}]
5:["$","$1","c",{"children":[null,["$","$Ld",null,{"parallelRouterKey":"children","error":"$undefined","errorStyles":"$undefined","errorScripts":"$undefined","template":["$","$Le",null,{}],"templateStyles":"$undefined","templateScripts":"$undefined","notFound":"$undefined","forbidden":"$undefined","unauthorized":"$undefined"}]]}]
6:["$","$1","c",{"children":[null,["$","$Ld",null,{"parallelRouterKey":"children","error":"$undefined","errorStyles":"$undefined","errorScripts":"$undefined","template":["$","$Le",null,{}],"templateStyles":"$undefined","templateScripts":"$undefined","notFound":"$undefined","forbidden":"$undefined","unauthorized":"$undefined"}]]}]
7:["$","$1","c",{"children":[["$","div",null,{"className":"min-h-screen bg-[#0B0F19] text-white flex flex-col justify-between overflow-x-hidden relative select-none","children":[["$","div",null,{"className":"absolute top-0 left-1/4 w-96 h-96 bg-blue-600/15 rounded-full filter blur-[120px] pointer-events-none"}],["$","div",null,{"className":"absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-600/15 rounded-full filter blur-[120px] pointer-events-none"}],["$","main",null,{"className":"flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-center py-6","children":["$","div",null,{"className":"grid grid-cols-1 lg:grid-cols-12 gap-8 items-center w-full","children":[["$","div",null,{"className":"hidden lg:flex lg:col-span-6 flex-col justify-center space-y-6 pr-4","children":[["$","div",null,{"className":"inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/80 w-fit backdrop-blur-md","children":[["$","$L10",null,{"ref":"$undefined","iconNode":[["path",{"d":"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z","key":"oel41y"}],["path",{"d":"m9 12 2 2 4-4","key":"dzmm74"}]],"className":"lucide-shield-check w-4 h-4 text-blue-400"}],["$","span",null,{"className":"text-xs font-semibold text-slate-300","children":"Super Distributor Master Console"}]]}],["$","div",null,{"className":"space-y-3","children":[["$","h1",null,{"className":"text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-tight","children":["Pay2Pay SD Portal ",["$","br",null,{}],["$","span",null,{"className":"bg-gradient-to-r from-blue-400 via-indigo-400 to-cyan-300 bg-clip-text text-transparent","children":"Super Distributor Workspace"}]]}],["$","p",null,{"className":"text-sm text-slate-400 leading-relaxed max-w-md","children":"Manage distributor networks, allocate credit limits, monitor regional fund movements, and analyze hierarchy performance."}]]}],["$","div",null,{"className":"grid grid-cols-2 gap-3 pt-2","children":[["$","div",null,{"className":"p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md flex items-start gap-3","children":[["$","div",null,{"className":"p-2 rounded-xl bg-blue-500/10 text-blue-400 shrink-0","children":["$","$L10",null,{"ref":"$undefined","iconNode":[["rect",{"x":"16","y":"16","width":"6","height":"6","rx":"1","key":"4q2zg0"}],["rect",{"x":"2","y":"16","width":"6","height":"6","rx":"1","key":"8cvhb9"}],["rect",{"x":"9","y":"2","width":"6","height":"6","rx":"1","key":"1egb70"}],["path",{"d":"M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3","key":"1jsf9p"}],["path",{"d":"M12 12V8","key":"2874zd"}]],"className":"lucide-network w-4 h-4"}]}],["$","div",null,{"children":[["$","h4",null,{"className":"text-xs font-bold text-white","children":"Network Control"}],["$","p",null,{"className":"text-[11px] text-slate-400","children":"Multi-tier distributor management"}]]}]]}],["$","div",null,{"className":"p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md flex items-start gap-3","children":[["$","div",null,{"className":"p-2 rounded-xl bg-indigo-500/10 text-indigo-400 shrink-0","children":["$","$L10",null,{"ref":"$undefined","iconNode":[["path",{"d":"M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z","key":"zw3jo"}],["path",{"d":"M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12","key":"1wduqc"}],["path",{"d":"M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17","key":"kqbvx6"}]],"className":"lucide-layers w-4 h-4"}]}],["$","div",null,{"children":[["$","h4",null,{"className":"text-xs font-bold text-white","children":"Bulk Liquidity"}],["$","p",null,{"className":"text-[11px] text-slate-400","children":"High-volume wallet credit allocation"}]]}]]}]]}]]}],["$","div",null,{"className":"lg:col-span-6 flex justify-center w-full","children":["$","div",null,{"className":"w-full max-w-md","children":["$","$L11",null,{"portalRole":"SD"}]}]}]]}]}]]}],[["$","script","script-0",{"src":"/_next/static/chunks/37asd_m7j2qhf.js","async":true,"nonce":"$undefined"}],"$L12"],"$L13"]}]
14:[]
8:"$W14"
9:["$","$1","h",{"children":[null,["$","$L15",null,{"children":"$L16"}],["$","div",null,{"hidden":true,"children":["$","$L17",null,{"children":["$","$18",null,{"name":"Next.Metadata","children":"$L19"}]}]}],null]}]
b:["$","link","0",{"rel":"stylesheet","href":"/_next/static/chunks/15-5wcm-1grrv.css","precedence":"next","crossOrigin":"$undefined","nonce":"$undefined"}]
1a:I[897367,["/_next/static/chunks/39iyiniitji8m.js","/_next/static/chunks/1ntn7efqc-iiw.js","/_next/static/chunks/2c5rvwq1ei0-i.js","/_next/static/chunks/1s50t5yz2fnzr.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/081f9uqhut_q2.js"],"OutletBoundary"]
12:["$","script","script-1",{"src":"/_next/static/chunks/1ghkha5bylp-5.js","async":true,"nonce":"$undefined"}]
13:["$","$L1a",null,{"children":["$","$18",null,{"name":"Next.MetadataOutlet","children":"$@1b"}]}]
16:[["$","meta","0",{"charSet":"utf-8"}],["$","meta","1",{"name":"viewport","content":"width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"}]]
1c:I[27201,["/_next/static/chunks/39iyiniitji8m.js","/_next/static/chunks/1ntn7efqc-iiw.js","/_next/static/chunks/2c5rvwq1ei0-i.js","/_next/static/chunks/1s50t5yz2fnzr.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/081f9uqhut_q2.js"],"IconMark"]
19:[["$","title","0",{"children":"Pay2Pay FinTech Retailer Platform"}],["$","meta","1",{"name":"description","content":"Enterprise Merchant Banking & Settlement Terminal"}],["$","link","2",{"rel":"manifest","href":"/site.webmanifest","crossOrigin":"$undefined"}],["$","link","3",{"rel":"shortcut icon","href":"/favicon.ico"}],["$","link","4",{"rel":"icon","href":"/favicon.ico?favicon.0dkwhtzwty2vg.ico","sizes":"256x256","type":"image/x-icon"}],["$","link","5",{"rel":"icon","href":"/favicon.ico"}],["$","link","6",{"rel":"icon","href":"/icon.png","type":"image/png"}],["$","link","7",{"rel":"icon","href":"/favicon-32x32.png","sizes":"32x32","type":"image/png"}],["$","link","8",{"rel":"icon","href":"/favicon-16x16.png","sizes":"16x16","type":"image/png"}],["$","link","9",{"rel":"apple-touch-icon","href":"/apple-touch-icon.png"}],["$","$L1c","10",{}]]
1b:null
