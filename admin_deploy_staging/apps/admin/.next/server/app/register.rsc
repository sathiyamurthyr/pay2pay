1:"$Sreact.fragment"
2:I[479520,["/_next/static/chunks/10un8k6wjmhhd.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/3dgrqbex-3-b2.js","/_next/static/chunks/081f9uqhut_q2.js","/_next/static/chunks/0b39sfkav7tdp.js","/_next/static/chunks/1ntn7efqc-iiw.js"],""]
8:I[168027,["/_next/static/chunks/10un8k6wjmhhd.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/3dgrqbex-3-b2.js","/_next/static/chunks/081f9uqhut_q2.js","/_next/static/chunks/0b39sfkav7tdp.js","/_next/static/chunks/1ntn7efqc-iiw.js"],"default",1]
:HL["/_next/static/chunks/233ubfxe22ai9.css","style"]
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
            0:{"P":null,"c":["","register"],"q":"","i":false,"f":[[["",{"children":["register",{"children":["__PAGE__",{}]}]},"$undefined","$undefined",16],[["$","$1","c",{"children":[[["$","link","0",{"rel":"stylesheet","href":"/_next/static/chunks/233ubfxe22ai9.css","precedence":"next","crossOrigin":"$undefined","nonce":"$undefined"}],["$","script","script-0",{"src":"/_next/static/chunks/10un8k6wjmhhd.js","async":true,"nonce":"$undefined"}],["$","script","script-1",{"src":"/_next/static/chunks/3aiu8uhh9ykx9.js","async":true,"nonce":"$undefined"}],["$","script","script-2",{"src":"/_next/static/chunks/3dgrqbex-3-b2.js","async":true,"nonce":"$undefined"}],["$","script","script-3",{"src":"/_next/static/chunks/081f9uqhut_q2.js","async":true,"nonce":"$undefined"}],["$","script","script-4",{"src":"/_next/static/chunks/0b39sfkav7tdp.js","async":true,"nonce":"$undefined"}],["$","script","script-5",{"src":"/_next/static/chunks/1ntn7efqc-iiw.js","async":true,"nonce":"$undefined"}]],["$","html",null,{"lang":"en","className":"dark","suppressHydrationWarning":true,"style":{"overflowX":"hidden","maxWidth":"100vw"},"children":["$","body",null,{"className":"antialiased min-h-screen bg-slate-950 text-slate-100","suppressHydrationWarning":true,"style":{"overflowX":"hidden","maxWidth":"100vw"},"children":[["$","$L2",null,{"id":"form-input-sanitizer","strategy":"afterInteractive","dangerouslySetInnerHTML":{"__html":"$3"}}],"$L4"]}]}]]}],{"children":["$L5",{"children":["$L6",{},null,false,null]},null,false,null]},null,false,null],"$L7",false]],"m":"$undefined","G":["$8",["$L9"]],"S":true,"h":null,"s":"$undefined","l":"$undefined","p":"$undefined","d":"$undefined","b":"clEZJ4pbFzWARUP91Z3Ut"}
a:I[374901,["/_next/static/chunks/10un8k6wjmhhd.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/3dgrqbex-3-b2.js","/_next/static/chunks/081f9uqhut_q2.js","/_next/static/chunks/0b39sfkav7tdp.js","/_next/static/chunks/1ntn7efqc-iiw.js"],"default"]
b:I[339756,["/_next/static/chunks/10un8k6wjmhhd.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/3dgrqbex-3-b2.js","/_next/static/chunks/081f9uqhut_q2.js","/_next/static/chunks/0b39sfkav7tdp.js","/_next/static/chunks/1ntn7efqc-iiw.js"],"default"]
c:I[837457,["/_next/static/chunks/10un8k6wjmhhd.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/3dgrqbex-3-b2.js","/_next/static/chunks/081f9uqhut_q2.js","/_next/static/chunks/0b39sfkav7tdp.js","/_next/static/chunks/1ntn7efqc-iiw.js"],"default"]
d:I[666771,["/_next/static/chunks/10un8k6wjmhhd.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/3dgrqbex-3-b2.js","/_next/static/chunks/081f9uqhut_q2.js","/_next/static/chunks/0b39sfkav7tdp.js","/_next/static/chunks/1ntn7efqc-iiw.js","/_next/static/chunks/2om5f4ruwp5wu.js","/_next/static/chunks/1al9xmfsqi4s7.js"],"default"]
e:I[92825,["/_next/static/chunks/10un8k6wjmhhd.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/3dgrqbex-3-b2.js","/_next/static/chunks/081f9uqhut_q2.js","/_next/static/chunks/0b39sfkav7tdp.js","/_next/static/chunks/1ntn7efqc-iiw.js"],"ClientSegmentRoot"]
f:I[522948,["/_next/static/chunks/10un8k6wjmhhd.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/3dgrqbex-3-b2.js","/_next/static/chunks/081f9uqhut_q2.js","/_next/static/chunks/0b39sfkav7tdp.js","/_next/static/chunks/1ntn7efqc-iiw.js","/_next/static/chunks/05w4to0ihllxo.js"],"default"]
11:I[347257,["/_next/static/chunks/10un8k6wjmhhd.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/3dgrqbex-3-b2.js","/_next/static/chunks/081f9uqhut_q2.js","/_next/static/chunks/0b39sfkav7tdp.js","/_next/static/chunks/1ntn7efqc-iiw.js"],"ClientPageRoot"]
12:I[452044,["/_next/static/chunks/10un8k6wjmhhd.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/3dgrqbex-3-b2.js","/_next/static/chunks/081f9uqhut_q2.js","/_next/static/chunks/0b39sfkav7tdp.js","/_next/static/chunks/1ntn7efqc-iiw.js","/_next/static/chunks/05w4to0ihllxo.js","/_next/static/chunks/2eqsu99i967tc.js"],"default"]
15:I[897367,["/_next/static/chunks/10un8k6wjmhhd.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/3dgrqbex-3-b2.js","/_next/static/chunks/081f9uqhut_q2.js","/_next/static/chunks/0b39sfkav7tdp.js","/_next/static/chunks/1ntn7efqc-iiw.js"],"OutletBoundary"]
16:"$Sreact.suspense"
18:I[897367,["/_next/static/chunks/10un8k6wjmhhd.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/3dgrqbex-3-b2.js","/_next/static/chunks/081f9uqhut_q2.js","/_next/static/chunks/0b39sfkav7tdp.js","/_next/static/chunks/1ntn7efqc-iiw.js"],"ViewportBoundary"]
1a:I[897367,["/_next/static/chunks/10un8k6wjmhhd.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/3dgrqbex-3-b2.js","/_next/static/chunks/081f9uqhut_q2.js","/_next/static/chunks/0b39sfkav7tdp.js","/_next/static/chunks/1ntn7efqc-iiw.js"],"MetadataBoundary"]
4:["$","$La",null,{"children":["$","$Lb",null,{"parallelRouterKey":"children","error":"$undefined","errorStyles":"$undefined","errorScripts":"$undefined","template":["$","$Lc",null,{}],"templateStyles":"$undefined","templateScripts":"$undefined","notFound":[["$","$Ld",null,{}],[]],"forbidden":"$undefined","unauthorized":"$undefined"}]}]
5:["$","$1","c",{"children":[[["$","script","script-0",{"src":"/_next/static/chunks/05w4to0ihllxo.js","async":true,"nonce":"$undefined"}]],["$","$Le",null,{"Component":"$f","slots":{"children":["$","$Lb",null,{"parallelRouterKey":"children","error":"$undefined","errorStyles":"$undefined","errorScripts":"$undefined","template":["$","$Lc",null,{}],"templateStyles":"$undefined","templateScripts":"$undefined","notFound":"$undefined","forbidden":"$undefined","unauthorized":"$undefined"}]},"serverProvidedParams":{"params":{},"promises":["$@10"]}}]]}]
6:["$","$1","c",{"children":[["$","$L11",null,{"Component":"$12","serverProvidedParams":{"searchParams":{},"params":"$5:props:children:1:props:serverProvidedParams:params","promises":["$@13","$@14"]}}],[["$","script","script-0",{"src":"/_next/static/chunks/2eqsu99i967tc.js","async":true,"nonce":"$undefined"}]],["$","$L15",null,{"children":["$","$16",null,{"name":"Next.MetadataOutlet","children":"$@17"}]}]]}]
7:["$","$1","h",{"children":[null,["$","$L18",null,{"children":"$L19"}],["$","div",null,{"hidden":true,"children":["$","$L1a",null,{"children":["$","$16",null,{"name":"Next.Metadata","children":"$L1b"}]}]}],null]}]
9:["$","link","0",{"rel":"stylesheet","href":"/_next/static/chunks/233ubfxe22ai9.css","precedence":"next","crossOrigin":"$undefined","nonce":"$undefined"}]
10:"$5:props:children:1:props:serverProvidedParams:params"
13:{}
14:"$5:props:children:1:props:serverProvidedParams:params"
19:[["$","meta","0",{"charSet":"utf-8"}],["$","meta","1",{"name":"viewport","content":"width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"}]]
1c:I[27201,["/_next/static/chunks/10un8k6wjmhhd.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/3dgrqbex-3-b2.js","/_next/static/chunks/081f9uqhut_q2.js","/_next/static/chunks/0b39sfkav7tdp.js","/_next/static/chunks/1ntn7efqc-iiw.js"],"IconMark"]
17:null
1b:[["$","title","0",{"children":"Pay2Pay FinTech Retailer Platform"}],["$","meta","1",{"name":"description","content":"Enterprise Merchant Banking & Settlement Terminal"}],["$","link","2",{"rel":"manifest","href":"/site.webmanifest","crossOrigin":"$undefined"}],["$","link","3",{"rel":"shortcut icon","href":"/favicon.ico"}],["$","link","4",{"rel":"icon","href":"/favicon.ico?favicon.0dkwhtzwty2vg.ico","sizes":"256x256","type":"image/x-icon"}],["$","link","5",{"rel":"icon","href":"/favicon.ico"}],["$","link","6",{"rel":"icon","href":"/icon.png","type":"image/png"}],["$","link","7",{"rel":"icon","href":"/favicon-32x32.png","sizes":"32x32","type":"image/png"}],["$","link","8",{"rel":"icon","href":"/favicon-16x16.png","sizes":"16x16","type":"image/png"}],["$","link","9",{"rel":"apple-touch-icon","href":"/apple-touch-icon.png"}],["$","$L1c","10",{}]]
