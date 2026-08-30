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
            0:{"P":null,"c":["","settlement-intake-dashboard"],"q":"","i":false,"f":[[["",{"children":["(dashboard)",{"children":["settlement-intake-dashboard",{"children":["__PAGE__",{}]}]},"$undefined","$undefined",4]},"$undefined","$undefined",24],[["$","$1","c",{"children":[[["$","link","0",{"rel":"stylesheet","href":"/_next/static/chunks/15-5wcm-1grrv.css","precedence":"next","crossOrigin":"$undefined","nonce":"$undefined"}],["$","script","script-0",{"src":"/_next/static/chunks/39iyiniitji8m.js","async":true,"nonce":"$undefined"}],["$","script","script-1",{"src":"/_next/static/chunks/1ntn7efqc-iiw.js","async":true,"nonce":"$undefined"}],["$","script","script-2",{"src":"/_next/static/chunks/2c5rvwq1ei0-i.js","async":true,"nonce":"$undefined"}],["$","script","script-3",{"src":"/_next/static/chunks/1s50t5yz2fnzr.js","async":true,"nonce":"$undefined"}],["$","script","script-4",{"src":"/_next/static/chunks/3aiu8uhh9ykx9.js","async":true,"nonce":"$undefined"}],["$","script","script-5",{"src":"/_next/static/chunks/081f9uqhut_q2.js","async":true,"nonce":"$undefined"}]],["$","html",null,{"lang":"en","className":"dark","suppressHydrationWarning":true,"style":{"overflowX":"hidden","maxWidth":"100vw"},"children":["$","body",null,{"className":"antialiased min-h-screen bg-slate-950 text-slate-100","suppressHydrationWarning":true,"style":{"overflowX":"hidden","maxWidth":"100vw"},"children":[["$","$L2",null,{"id":"form-input-sanitizer","strategy":"afterInteractive","dangerouslySetInnerHTML":{"__html":"$3"}}],"$L4"]}]}]]}],{"children":["$L5",{"children":["$L6",{"children":["$L7",{},null,false,null]},null,false,"$@8"]},null,false,null]},null,false,null],"$L9",false]],"m":"$undefined","G":["$a",["$Lb"]],"S":true,"h":null,"s":"$undefined","l":"$undefined","p":"$undefined","d":"$undefined","b":"2wFblw0ifYlcXw1UugM7A"}
c:I[544636,["/_next/static/chunks/39iyiniitji8m.js","/_next/static/chunks/1ntn7efqc-iiw.js","/_next/static/chunks/2c5rvwq1ei0-i.js","/_next/static/chunks/1s50t5yz2fnzr.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/081f9uqhut_q2.js"],"default"]
d:I[339756,["/_next/static/chunks/39iyiniitji8m.js","/_next/static/chunks/1ntn7efqc-iiw.js","/_next/static/chunks/2c5rvwq1ei0-i.js","/_next/static/chunks/1s50t5yz2fnzr.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/081f9uqhut_q2.js"],"default"]
e:I[837457,["/_next/static/chunks/39iyiniitji8m.js","/_next/static/chunks/1ntn7efqc-iiw.js","/_next/static/chunks/2c5rvwq1ei0-i.js","/_next/static/chunks/1s50t5yz2fnzr.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/081f9uqhut_q2.js"],"default"]
f:I[329306,["/_next/static/chunks/39iyiniitji8m.js","/_next/static/chunks/1ntn7efqc-iiw.js","/_next/static/chunks/2c5rvwq1ei0-i.js","/_next/static/chunks/1s50t5yz2fnzr.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/081f9uqhut_q2.js","/_next/static/chunks/390xthzerc20i.js","/_next/static/chunks/1gzmmyyov0nu_.js"],"default"]
10:I[339756,["/_next/static/chunks/39iyiniitji8m.js","/_next/static/chunks/1ntn7efqc-iiw.js","/_next/static/chunks/2c5rvwq1ei0-i.js","/_next/static/chunks/1s50t5yz2fnzr.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/081f9uqhut_q2.js"],"LoadingBoundaryProvider"]
11:I[214542,["/_next/static/chunks/39iyiniitji8m.js","/_next/static/chunks/1ntn7efqc-iiw.js","/_next/static/chunks/2c5rvwq1ei0-i.js","/_next/static/chunks/1s50t5yz2fnzr.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/081f9uqhut_q2.js","/_next/static/chunks/2_b5onqum9fft.js","/_next/static/chunks/1t9o8q79p54eg.js","/_next/static/chunks/1gzmmyyov0nu_.js","/_next/static/chunks/0cmb89n4wauii.js","/_next/static/chunks/06x4bf1szmzze.js","/_next/static/chunks/00u2v_gdsoty2.js","/_next/static/chunks/3ewoa4x94zg3a.js","/_next/static/chunks/07fxrqzwfknz1.js","/_next/static/chunks/08rh4ptz3rjz0.js","/_next/static/chunks/06ecm617dp1in.js","/_next/static/chunks/2wgx_yesnbwgq.js"],"default"]
12:I[92825,["/_next/static/chunks/39iyiniitji8m.js","/_next/static/chunks/1ntn7efqc-iiw.js","/_next/static/chunks/2c5rvwq1ei0-i.js","/_next/static/chunks/1s50t5yz2fnzr.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/081f9uqhut_q2.js"],"ClientSegmentRoot"]
13:I[216370,["/_next/static/chunks/39iyiniitji8m.js","/_next/static/chunks/1ntn7efqc-iiw.js","/_next/static/chunks/2c5rvwq1ei0-i.js","/_next/static/chunks/1s50t5yz2fnzr.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/081f9uqhut_q2.js","/_next/static/chunks/2_b5onqum9fft.js","/_next/static/chunks/1t9o8q79p54eg.js","/_next/static/chunks/1gzmmyyov0nu_.js","/_next/static/chunks/0cmb89n4wauii.js","/_next/static/chunks/06x4bf1szmzze.js","/_next/static/chunks/00u2v_gdsoty2.js","/_next/static/chunks/3ewoa4x94zg3a.js","/_next/static/chunks/07fxrqzwfknz1.js","/_next/static/chunks/08rh4ptz3rjz0.js","/_next/static/chunks/06ecm617dp1in.js"],"default"]
14:I[641811,["/_next/static/chunks/39iyiniitji8m.js","/_next/static/chunks/1ntn7efqc-iiw.js","/_next/static/chunks/2c5rvwq1ei0-i.js","/_next/static/chunks/1s50t5yz2fnzr.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/081f9uqhut_q2.js","/_next/static/chunks/2_b5onqum9fft.js","/_next/static/chunks/1t9o8q79p54eg.js","/_next/static/chunks/1gzmmyyov0nu_.js","/_next/static/chunks/0cmb89n4wauii.js","/_next/static/chunks/06x4bf1szmzze.js","/_next/static/chunks/00u2v_gdsoty2.js","/_next/static/chunks/3ewoa4x94zg3a.js","/_next/static/chunks/07fxrqzwfknz1.js","/_next/static/chunks/08rh4ptz3rjz0.js","/_next/static/chunks/06ecm617dp1in.js","/_next/static/chunks/38dxk1arxg2ul.js"],"default"]
16:I[347257,["/_next/static/chunks/39iyiniitji8m.js","/_next/static/chunks/1ntn7efqc-iiw.js","/_next/static/chunks/2c5rvwq1ei0-i.js","/_next/static/chunks/1s50t5yz2fnzr.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/081f9uqhut_q2.js"],"ClientPageRoot"]
17:I[975278,["/_next/static/chunks/39iyiniitji8m.js","/_next/static/chunks/1ntn7efqc-iiw.js","/_next/static/chunks/2c5rvwq1ei0-i.js","/_next/static/chunks/1s50t5yz2fnzr.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/081f9uqhut_q2.js","/_next/static/chunks/2_b5onqum9fft.js","/_next/static/chunks/1t9o8q79p54eg.js","/_next/static/chunks/1gzmmyyov0nu_.js","/_next/static/chunks/0cmb89n4wauii.js","/_next/static/chunks/06x4bf1szmzze.js","/_next/static/chunks/00u2v_gdsoty2.js","/_next/static/chunks/3ewoa4x94zg3a.js","/_next/static/chunks/07fxrqzwfknz1.js","/_next/static/chunks/08rh4ptz3rjz0.js","/_next/static/chunks/06ecm617dp1in.js","/_next/static/chunks/1rmfgyogr3xr-.js"],"default"]
1a:I[897367,["/_next/static/chunks/39iyiniitji8m.js","/_next/static/chunks/1ntn7efqc-iiw.js","/_next/static/chunks/2c5rvwq1ei0-i.js","/_next/static/chunks/1s50t5yz2fnzr.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/081f9uqhut_q2.js"],"OutletBoundary"]
1b:"$Sreact.suspense"
1e:I[897367,["/_next/static/chunks/39iyiniitji8m.js","/_next/static/chunks/1ntn7efqc-iiw.js","/_next/static/chunks/2c5rvwq1ei0-i.js","/_next/static/chunks/1s50t5yz2fnzr.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/081f9uqhut_q2.js"],"ViewportBoundary"]
20:I[897367,["/_next/static/chunks/39iyiniitji8m.js","/_next/static/chunks/1ntn7efqc-iiw.js","/_next/static/chunks/2c5rvwq1ei0-i.js","/_next/static/chunks/1s50t5yz2fnzr.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/081f9uqhut_q2.js"],"MetadataBoundary"]
4:["$","$Lc",null,{"children":["$","$Ld",null,{"parallelRouterKey":"children","error":"$undefined","errorStyles":"$undefined","errorScripts":"$undefined","template":["$","$Le",null,{}],"templateStyles":"$undefined","templateScripts":"$undefined","notFound":[["$","$Lf",null,{}],[]],"forbidden":"$undefined","unauthorized":"$undefined"}]}]
5:["$","$L10",null,{"loading":[["$","$L11","l",{}],[],[["$","script","script-0",{"src":"/_next/static/chunks/2wgx_yesnbwgq.js","async":true}]]],"children":["$","$1","c",{"children":[[["$","script","script-0",{"src":"/_next/static/chunks/2_b5onqum9fft.js","async":true,"nonce":"$undefined"}],["$","script","script-1",{"src":"/_next/static/chunks/1t9o8q79p54eg.js","async":true,"nonce":"$undefined"}],["$","script","script-2",{"src":"/_next/static/chunks/1gzmmyyov0nu_.js","async":true,"nonce":"$undefined"}],["$","script","script-3",{"src":"/_next/static/chunks/0cmb89n4wauii.js","async":true,"nonce":"$undefined"}],["$","script","script-4",{"src":"/_next/static/chunks/06x4bf1szmzze.js","async":true,"nonce":"$undefined"}],["$","script","script-5",{"src":"/_next/static/chunks/00u2v_gdsoty2.js","async":true,"nonce":"$undefined"}],["$","script","script-6",{"src":"/_next/static/chunks/3ewoa4x94zg3a.js","async":true,"nonce":"$undefined"}],["$","script","script-7",{"src":"/_next/static/chunks/07fxrqzwfknz1.js","async":true,"nonce":"$undefined"}],["$","script","script-8",{"src":"/_next/static/chunks/08rh4ptz3rjz0.js","async":true,"nonce":"$undefined"}],["$","script","script-9",{"src":"/_next/static/chunks/06ecm617dp1in.js","async":true,"nonce":"$undefined"}]],["$","$L12",null,{"Component":"$13","slots":{"children":["$","$Ld",null,{"parallelRouterKey":"children","error":"$undefined","errorStyles":"$undefined","errorScripts":"$undefined","template":["$","$Le",null,{}],"templateStyles":"$undefined","templateScripts":"$undefined","notFound":[["$","$L14",null,{}],[]],"forbidden":"$undefined","unauthorized":"$undefined"}]},"serverProvidedParams":{"params":{},"promises":["$@15"]}}]]}]}]
6:["$","$1","c",{"children":[null,["$","$Ld",null,{"parallelRouterKey":"children","error":"$undefined","errorStyles":"$undefined","errorScripts":"$undefined","template":["$","$Le",null,{}],"templateStyles":"$undefined","templateScripts":"$undefined","notFound":"$undefined","forbidden":"$undefined","unauthorized":"$undefined"}]]}]
7:["$","$1","c",{"children":[["$","$L16",null,{"Component":"$17","serverProvidedParams":{"searchParams":{},"params":"$5:props:children:props:children:1:props:serverProvidedParams:params","promises":["$@18","$@19"]}}],[["$","script","script-0",{"src":"/_next/static/chunks/1rmfgyogr3xr-.js","async":true,"nonce":"$undefined"}]],["$","$L1a",null,{"children":["$","$1b",null,{"name":"Next.MetadataOutlet","children":"$@1c"}]}]]}]
1d:[]
8:"$W1d"
9:["$","$1","h",{"children":[null,["$","$L1e",null,{"children":"$L1f"}],["$","div",null,{"hidden":true,"children":["$","$L20",null,{"children":["$","$1b",null,{"name":"Next.Metadata","children":"$L21"}]}]}],null]}]
b:["$","link","0",{"rel":"stylesheet","href":"/_next/static/chunks/15-5wcm-1grrv.css","precedence":"next","crossOrigin":"$undefined","nonce":"$undefined"}]
15:"$5:props:children:props:children:1:props:serverProvidedParams:params"
18:{}
19:"$5:props:children:props:children:1:props:serverProvidedParams:params"
1f:[["$","meta","0",{"charSet":"utf-8"}],["$","meta","1",{"name":"viewport","content":"width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"}]]
22:I[27201,["/_next/static/chunks/39iyiniitji8m.js","/_next/static/chunks/1ntn7efqc-iiw.js","/_next/static/chunks/2c5rvwq1ei0-i.js","/_next/static/chunks/1s50t5yz2fnzr.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/081f9uqhut_q2.js"],"IconMark"]
1c:null
21:[["$","title","0",{"children":"Pay2Pay FinTech Retailer Platform"}],["$","meta","1",{"name":"description","content":"Enterprise Merchant Banking & Settlement Terminal"}],["$","link","2",{"rel":"manifest","href":"/site.webmanifest","crossOrigin":"$undefined"}],["$","link","3",{"rel":"shortcut icon","href":"/favicon.ico"}],["$","link","4",{"rel":"icon","href":"/favicon.ico?favicon.0dkwhtzwty2vg.ico","sizes":"256x256","type":"image/x-icon"}],["$","link","5",{"rel":"icon","href":"/favicon.ico"}],["$","link","6",{"rel":"icon","href":"/icon.png","type":"image/png"}],["$","link","7",{"rel":"icon","href":"/favicon-32x32.png","sizes":"32x32","type":"image/png"}],["$","link","8",{"rel":"icon","href":"/favicon-16x16.png","sizes":"16x16","type":"image/png"}],["$","link","9",{"rel":"apple-touch-icon","href":"/apple-touch-icon.png"}],["$","$L22","10",{}]]
