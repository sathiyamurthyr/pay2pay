1:"$Sreact.fragment"
2:I[479520,["/_next/static/chunks/39iyiniitji8m.js","/_next/static/chunks/1ntn7efqc-iiw.js","/_next/static/chunks/2c5rvwq1ei0-i.js","/_next/static/chunks/1s50t5yz2fnzr.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/081f9uqhut_q2.js"],""]
b:I[168027,["/_next/static/chunks/39iyiniitji8m.js","/_next/static/chunks/1ntn7efqc-iiw.js","/_next/static/chunks/2c5rvwq1ei0-i.js","/_next/static/chunks/1s50t5yz2fnzr.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/081f9uqhut_q2.js"],"default",1]
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
            0:{"P":null,"c":["","operations","queues"],"q":"","i":false,"f":[[["",{"children":["(dashboard)",{"children":["operations",{"children":["queues",{"children":["__PAGE__",{}]}]}]},"$undefined","$undefined",4]},"$undefined","$undefined",24],[["$","$1","c",{"children":[[["$","link","0",{"rel":"stylesheet","href":"/_next/static/chunks/15-5wcm-1grrv.css","precedence":"next","crossOrigin":"$undefined","nonce":"$undefined"}],["$","script","script-0",{"src":"/_next/static/chunks/39iyiniitji8m.js","async":true,"nonce":"$undefined"}],["$","script","script-1",{"src":"/_next/static/chunks/1ntn7efqc-iiw.js","async":true,"nonce":"$undefined"}],["$","script","script-2",{"src":"/_next/static/chunks/2c5rvwq1ei0-i.js","async":true,"nonce":"$undefined"}],["$","script","script-3",{"src":"/_next/static/chunks/1s50t5yz2fnzr.js","async":true,"nonce":"$undefined"}],["$","script","script-4",{"src":"/_next/static/chunks/3aiu8uhh9ykx9.js","async":true,"nonce":"$undefined"}],["$","script","script-5",{"src":"/_next/static/chunks/081f9uqhut_q2.js","async":true,"nonce":"$undefined"}]],["$","html",null,{"lang":"en","className":"dark","suppressHydrationWarning":true,"style":{"overflowX":"hidden","maxWidth":"100vw"},"children":["$","body",null,{"className":"antialiased min-h-screen bg-slate-950 text-slate-100","suppressHydrationWarning":true,"style":{"overflowX":"hidden","maxWidth":"100vw"},"children":[["$","$L2",null,{"id":"form-input-sanitizer","strategy":"afterInteractive","dangerouslySetInnerHTML":{"__html":"$3"}}],"$L4"]}]}]]}],{"children":["$L5",{"children":["$L6",{"children":["$L7",{"children":["$L8",{},null,false,null]},null,false,"$@9"]},null,false,"$@9"]},null,false,null]},null,false,null],"$La",false]],"m":"$undefined","G":["$b",["$Lc"]],"S":true,"h":null,"s":"$undefined","l":"$undefined","p":"$undefined","d":"$undefined","b":"2wFblw0ifYlcXw1UugM7A"}
d:I[544636,["/_next/static/chunks/39iyiniitji8m.js","/_next/static/chunks/1ntn7efqc-iiw.js","/_next/static/chunks/2c5rvwq1ei0-i.js","/_next/static/chunks/1s50t5yz2fnzr.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/081f9uqhut_q2.js"],"default"]
e:I[339756,["/_next/static/chunks/39iyiniitji8m.js","/_next/static/chunks/1ntn7efqc-iiw.js","/_next/static/chunks/2c5rvwq1ei0-i.js","/_next/static/chunks/1s50t5yz2fnzr.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/081f9uqhut_q2.js"],"default"]
f:I[837457,["/_next/static/chunks/39iyiniitji8m.js","/_next/static/chunks/1ntn7efqc-iiw.js","/_next/static/chunks/2c5rvwq1ei0-i.js","/_next/static/chunks/1s50t5yz2fnzr.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/081f9uqhut_q2.js"],"default"]
10:I[329306,["/_next/static/chunks/39iyiniitji8m.js","/_next/static/chunks/1ntn7efqc-iiw.js","/_next/static/chunks/2c5rvwq1ei0-i.js","/_next/static/chunks/1s50t5yz2fnzr.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/081f9uqhut_q2.js","/_next/static/chunks/390xthzerc20i.js","/_next/static/chunks/1gzmmyyov0nu_.js"],"default"]
11:I[339756,["/_next/static/chunks/39iyiniitji8m.js","/_next/static/chunks/1ntn7efqc-iiw.js","/_next/static/chunks/2c5rvwq1ei0-i.js","/_next/static/chunks/1s50t5yz2fnzr.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/081f9uqhut_q2.js"],"LoadingBoundaryProvider"]
12:I[214542,["/_next/static/chunks/39iyiniitji8m.js","/_next/static/chunks/1ntn7efqc-iiw.js","/_next/static/chunks/2c5rvwq1ei0-i.js","/_next/static/chunks/1s50t5yz2fnzr.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/081f9uqhut_q2.js","/_next/static/chunks/2_b5onqum9fft.js","/_next/static/chunks/1t9o8q79p54eg.js","/_next/static/chunks/1gzmmyyov0nu_.js","/_next/static/chunks/0cmb89n4wauii.js","/_next/static/chunks/06x4bf1szmzze.js","/_next/static/chunks/00u2v_gdsoty2.js","/_next/static/chunks/3ewoa4x94zg3a.js","/_next/static/chunks/07fxrqzwfknz1.js","/_next/static/chunks/08rh4ptz3rjz0.js","/_next/static/chunks/06ecm617dp1in.js","/_next/static/chunks/2wgx_yesnbwgq.js"],"default"]
13:I[92825,["/_next/static/chunks/39iyiniitji8m.js","/_next/static/chunks/1ntn7efqc-iiw.js","/_next/static/chunks/2c5rvwq1ei0-i.js","/_next/static/chunks/1s50t5yz2fnzr.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/081f9uqhut_q2.js"],"ClientSegmentRoot"]
14:I[216370,["/_next/static/chunks/39iyiniitji8m.js","/_next/static/chunks/1ntn7efqc-iiw.js","/_next/static/chunks/2c5rvwq1ei0-i.js","/_next/static/chunks/1s50t5yz2fnzr.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/081f9uqhut_q2.js","/_next/static/chunks/2_b5onqum9fft.js","/_next/static/chunks/1t9o8q79p54eg.js","/_next/static/chunks/1gzmmyyov0nu_.js","/_next/static/chunks/0cmb89n4wauii.js","/_next/static/chunks/06x4bf1szmzze.js","/_next/static/chunks/00u2v_gdsoty2.js","/_next/static/chunks/3ewoa4x94zg3a.js","/_next/static/chunks/07fxrqzwfknz1.js","/_next/static/chunks/08rh4ptz3rjz0.js","/_next/static/chunks/06ecm617dp1in.js"],"default"]
15:I[641811,["/_next/static/chunks/39iyiniitji8m.js","/_next/static/chunks/1ntn7efqc-iiw.js","/_next/static/chunks/2c5rvwq1ei0-i.js","/_next/static/chunks/1s50t5yz2fnzr.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/081f9uqhut_q2.js","/_next/static/chunks/2_b5onqum9fft.js","/_next/static/chunks/1t9o8q79p54eg.js","/_next/static/chunks/1gzmmyyov0nu_.js","/_next/static/chunks/0cmb89n4wauii.js","/_next/static/chunks/06x4bf1szmzze.js","/_next/static/chunks/00u2v_gdsoty2.js","/_next/static/chunks/3ewoa4x94zg3a.js","/_next/static/chunks/07fxrqzwfknz1.js","/_next/static/chunks/08rh4ptz3rjz0.js","/_next/static/chunks/06ecm617dp1in.js","/_next/static/chunks/38dxk1arxg2ul.js"],"default"]
17:I[347257,["/_next/static/chunks/39iyiniitji8m.js","/_next/static/chunks/1ntn7efqc-iiw.js","/_next/static/chunks/2c5rvwq1ei0-i.js","/_next/static/chunks/1s50t5yz2fnzr.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/081f9uqhut_q2.js"],"ClientPageRoot"]
18:I[646525,["/_next/static/chunks/39iyiniitji8m.js","/_next/static/chunks/1ntn7efqc-iiw.js","/_next/static/chunks/2c5rvwq1ei0-i.js","/_next/static/chunks/1s50t5yz2fnzr.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/081f9uqhut_q2.js","/_next/static/chunks/2_b5onqum9fft.js","/_next/static/chunks/1t9o8q79p54eg.js","/_next/static/chunks/1gzmmyyov0nu_.js","/_next/static/chunks/0cmb89n4wauii.js","/_next/static/chunks/06x4bf1szmzze.js","/_next/static/chunks/00u2v_gdsoty2.js","/_next/static/chunks/3ewoa4x94zg3a.js","/_next/static/chunks/07fxrqzwfknz1.js","/_next/static/chunks/08rh4ptz3rjz0.js","/_next/static/chunks/06ecm617dp1in.js","/_next/static/chunks/16ykzxb7ms4wm.js"],"default"]
1b:I[897367,["/_next/static/chunks/39iyiniitji8m.js","/_next/static/chunks/1ntn7efqc-iiw.js","/_next/static/chunks/2c5rvwq1ei0-i.js","/_next/static/chunks/1s50t5yz2fnzr.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/081f9uqhut_q2.js"],"OutletBoundary"]
1c:"$Sreact.suspense"
1f:I[897367,["/_next/static/chunks/39iyiniitji8m.js","/_next/static/chunks/1ntn7efqc-iiw.js","/_next/static/chunks/2c5rvwq1ei0-i.js","/_next/static/chunks/1s50t5yz2fnzr.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/081f9uqhut_q2.js"],"ViewportBoundary"]
21:I[897367,["/_next/static/chunks/39iyiniitji8m.js","/_next/static/chunks/1ntn7efqc-iiw.js","/_next/static/chunks/2c5rvwq1ei0-i.js","/_next/static/chunks/1s50t5yz2fnzr.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/081f9uqhut_q2.js"],"MetadataBoundary"]
4:["$","$Ld",null,{"children":["$","$Le",null,{"parallelRouterKey":"children","error":"$undefined","errorStyles":"$undefined","errorScripts":"$undefined","template":["$","$Lf",null,{}],"templateStyles":"$undefined","templateScripts":"$undefined","notFound":[["$","$L10",null,{}],[]],"forbidden":"$undefined","unauthorized":"$undefined"}]}]
5:["$","$L11",null,{"loading":[["$","$L12","l",{}],[],[["$","script","script-0",{"src":"/_next/static/chunks/2wgx_yesnbwgq.js","async":true}]]],"children":["$","$1","c",{"children":[[["$","script","script-0",{"src":"/_next/static/chunks/2_b5onqum9fft.js","async":true,"nonce":"$undefined"}],["$","script","script-1",{"src":"/_next/static/chunks/1t9o8q79p54eg.js","async":true,"nonce":"$undefined"}],["$","script","script-2",{"src":"/_next/static/chunks/1gzmmyyov0nu_.js","async":true,"nonce":"$undefined"}],["$","script","script-3",{"src":"/_next/static/chunks/0cmb89n4wauii.js","async":true,"nonce":"$undefined"}],["$","script","script-4",{"src":"/_next/static/chunks/06x4bf1szmzze.js","async":true,"nonce":"$undefined"}],["$","script","script-5",{"src":"/_next/static/chunks/00u2v_gdsoty2.js","async":true,"nonce":"$undefined"}],["$","script","script-6",{"src":"/_next/static/chunks/3ewoa4x94zg3a.js","async":true,"nonce":"$undefined"}],["$","script","script-7",{"src":"/_next/static/chunks/07fxrqzwfknz1.js","async":true,"nonce":"$undefined"}],["$","script","script-8",{"src":"/_next/static/chunks/08rh4ptz3rjz0.js","async":true,"nonce":"$undefined"}],["$","script","script-9",{"src":"/_next/static/chunks/06ecm617dp1in.js","async":true,"nonce":"$undefined"}]],["$","$L13",null,{"Component":"$14","slots":{"children":["$","$Le",null,{"parallelRouterKey":"children","error":"$undefined","errorStyles":"$undefined","errorScripts":"$undefined","template":["$","$Lf",null,{}],"templateStyles":"$undefined","templateScripts":"$undefined","notFound":[["$","$L15",null,{}],[]],"forbidden":"$undefined","unauthorized":"$undefined"}]},"serverProvidedParams":{"params":{},"promises":["$@16"]}}]]}]}]
6:["$","$1","c",{"children":[null,["$","$Le",null,{"parallelRouterKey":"children","error":"$undefined","errorStyles":"$undefined","errorScripts":"$undefined","template":["$","$Lf",null,{}],"templateStyles":"$undefined","templateScripts":"$undefined","notFound":"$undefined","forbidden":"$undefined","unauthorized":"$undefined"}]]}]
7:["$","$1","c",{"children":[null,["$","$Le",null,{"parallelRouterKey":"children","error":"$undefined","errorStyles":"$undefined","errorScripts":"$undefined","template":["$","$Lf",null,{}],"templateStyles":"$undefined","templateScripts":"$undefined","notFound":"$undefined","forbidden":"$undefined","unauthorized":"$undefined"}]]}]
8:["$","$1","c",{"children":[["$","$L17",null,{"Component":"$18","serverProvidedParams":{"searchParams":{},"params":"$5:props:children:props:children:1:props:serverProvidedParams:params","promises":["$@19","$@1a"]}}],[["$","script","script-0",{"src":"/_next/static/chunks/16ykzxb7ms4wm.js","async":true,"nonce":"$undefined"}]],["$","$L1b",null,{"children":["$","$1c",null,{"name":"Next.MetadataOutlet","children":"$@1d"}]}]]}]
1e:[]
9:"$W1e"
a:["$","$1","h",{"children":[null,["$","$L1f",null,{"children":"$L20"}],["$","div",null,{"hidden":true,"children":["$","$L21",null,{"children":["$","$1c",null,{"name":"Next.Metadata","children":"$L22"}]}]}],null]}]
c:["$","link","0",{"rel":"stylesheet","href":"/_next/static/chunks/15-5wcm-1grrv.css","precedence":"next","crossOrigin":"$undefined","nonce":"$undefined"}]
16:"$5:props:children:props:children:1:props:serverProvidedParams:params"
19:{}
1a:"$5:props:children:props:children:1:props:serverProvidedParams:params"
20:[["$","meta","0",{"charSet":"utf-8"}],["$","meta","1",{"name":"viewport","content":"width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"}]]
23:I[27201,["/_next/static/chunks/39iyiniitji8m.js","/_next/static/chunks/1ntn7efqc-iiw.js","/_next/static/chunks/2c5rvwq1ei0-i.js","/_next/static/chunks/1s50t5yz2fnzr.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/081f9uqhut_q2.js"],"IconMark"]
1d:null
22:[["$","title","0",{"children":"Pay2Pay FinTech Retailer Platform"}],["$","meta","1",{"name":"description","content":"Enterprise Merchant Banking & Settlement Terminal"}],["$","link","2",{"rel":"manifest","href":"/site.webmanifest","crossOrigin":"$undefined"}],["$","link","3",{"rel":"shortcut icon","href":"/favicon.ico"}],["$","link","4",{"rel":"icon","href":"/favicon.ico?favicon.0dkwhtzwty2vg.ico","sizes":"256x256","type":"image/x-icon"}],["$","link","5",{"rel":"icon","href":"/favicon.ico"}],["$","link","6",{"rel":"icon","href":"/icon.png","type":"image/png"}],["$","link","7",{"rel":"icon","href":"/favicon-32x32.png","sizes":"32x32","type":"image/png"}],["$","link","8",{"rel":"icon","href":"/favicon-16x16.png","sizes":"16x16","type":"image/png"}],["$","link","9",{"rel":"apple-touch-icon","href":"/apple-touch-icon.png"}],["$","$L23","10",{}]]
