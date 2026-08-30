1:"$Sreact.fragment"
2:I[479520,["/_next/static/chunks/10un8k6wjmhhd.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/3dgrqbex-3-b2.js","/_next/static/chunks/081f9uqhut_q2.js","/_next/static/chunks/0b39sfkav7tdp.js","/_next/static/chunks/1ntn7efqc-iiw.js"],""]
9:I[168027,["/_next/static/chunks/10un8k6wjmhhd.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/3dgrqbex-3-b2.js","/_next/static/chunks/081f9uqhut_q2.js","/_next/static/chunks/0b39sfkav7tdp.js","/_next/static/chunks/1ntn7efqc-iiw.js"],"default",1]
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
            0:{"P":null,"c":["","_not-found"],"q":"","i":false,"f":[[["",{"children":["/_not-found",{"children":["__PAGE__",{}]}]},"$undefined","$undefined",16],[["$","$1","c",{"children":[[["$","link","0",{"rel":"stylesheet","href":"/_next/static/chunks/233ubfxe22ai9.css","precedence":"next","crossOrigin":"$undefined","nonce":"$undefined"}],["$","script","script-0",{"src":"/_next/static/chunks/10un8k6wjmhhd.js","async":true,"nonce":"$undefined"}],["$","script","script-1",{"src":"/_next/static/chunks/3aiu8uhh9ykx9.js","async":true,"nonce":"$undefined"}],["$","script","script-2",{"src":"/_next/static/chunks/3dgrqbex-3-b2.js","async":true,"nonce":"$undefined"}],["$","script","script-3",{"src":"/_next/static/chunks/081f9uqhut_q2.js","async":true,"nonce":"$undefined"}],["$","script","script-4",{"src":"/_next/static/chunks/0b39sfkav7tdp.js","async":true,"nonce":"$undefined"}],["$","script","script-5",{"src":"/_next/static/chunks/1ntn7efqc-iiw.js","async":true,"nonce":"$undefined"}]],["$","html",null,{"lang":"en","className":"dark","suppressHydrationWarning":true,"style":{"overflowX":"hidden","maxWidth":"100vw"},"children":["$","body",null,{"className":"antialiased min-h-screen bg-slate-950 text-slate-100","suppressHydrationWarning":true,"style":{"overflowX":"hidden","maxWidth":"100vw"},"children":[["$","$L2",null,{"id":"form-input-sanitizer","strategy":"afterInteractive","dangerouslySetInnerHTML":{"__html":"$3"}}],"$L4"]}]}]]}],{"children":["$L5",{"children":["$L6",{},null,false,null]},null,false,"$@7"]},null,false,null],"$L8",false]],"m":"$undefined","G":["$9",["$La"]],"S":true,"h":null,"s":"$undefined","l":"$undefined","p":"$undefined","d":"$undefined","b":"clEZJ4pbFzWARUP91Z3Ut"}
b:I[374901,["/_next/static/chunks/10un8k6wjmhhd.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/3dgrqbex-3-b2.js","/_next/static/chunks/081f9uqhut_q2.js","/_next/static/chunks/0b39sfkav7tdp.js","/_next/static/chunks/1ntn7efqc-iiw.js"],"default"]
c:I[339756,["/_next/static/chunks/10un8k6wjmhhd.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/3dgrqbex-3-b2.js","/_next/static/chunks/081f9uqhut_q2.js","/_next/static/chunks/0b39sfkav7tdp.js","/_next/static/chunks/1ntn7efqc-iiw.js"],"default"]
d:I[837457,["/_next/static/chunks/10un8k6wjmhhd.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/3dgrqbex-3-b2.js","/_next/static/chunks/081f9uqhut_q2.js","/_next/static/chunks/0b39sfkav7tdp.js","/_next/static/chunks/1ntn7efqc-iiw.js"],"default"]
e:I[666771,["/_next/static/chunks/10un8k6wjmhhd.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/3dgrqbex-3-b2.js","/_next/static/chunks/081f9uqhut_q2.js","/_next/static/chunks/0b39sfkav7tdp.js","/_next/static/chunks/1ntn7efqc-iiw.js","/_next/static/chunks/2om5f4ruwp5wu.js","/_next/static/chunks/1al9xmfsqi4s7.js"],"default"]
f:I[347257,["/_next/static/chunks/10un8k6wjmhhd.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/3dgrqbex-3-b2.js","/_next/static/chunks/081f9uqhut_q2.js","/_next/static/chunks/0b39sfkav7tdp.js","/_next/static/chunks/1ntn7efqc-iiw.js"],"ClientPageRoot"]
12:I[897367,["/_next/static/chunks/10un8k6wjmhhd.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/3dgrqbex-3-b2.js","/_next/static/chunks/081f9uqhut_q2.js","/_next/static/chunks/0b39sfkav7tdp.js","/_next/static/chunks/1ntn7efqc-iiw.js"],"OutletBoundary"]
13:"$Sreact.suspense"
16:I[897367,["/_next/static/chunks/10un8k6wjmhhd.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/3dgrqbex-3-b2.js","/_next/static/chunks/081f9uqhut_q2.js","/_next/static/chunks/0b39sfkav7tdp.js","/_next/static/chunks/1ntn7efqc-iiw.js"],"ViewportBoundary"]
18:I[897367,["/_next/static/chunks/10un8k6wjmhhd.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/3dgrqbex-3-b2.js","/_next/static/chunks/081f9uqhut_q2.js","/_next/static/chunks/0b39sfkav7tdp.js","/_next/static/chunks/1ntn7efqc-iiw.js"],"MetadataBoundary"]
4:["$","$Lb",null,{"children":["$","$Lc",null,{"parallelRouterKey":"children","error":"$undefined","errorStyles":"$undefined","errorScripts":"$undefined","template":["$","$Ld",null,{}],"templateStyles":"$undefined","templateScripts":"$undefined","notFound":[["$","$Le",null,{}],[]],"forbidden":"$undefined","unauthorized":"$undefined"}]}]
5:["$","$1","c",{"children":[null,["$","$Lc",null,{"parallelRouterKey":"children","error":"$undefined","errorStyles":"$undefined","errorScripts":"$undefined","template":["$","$Ld",null,{}],"templateStyles":"$undefined","templateScripts":"$undefined","notFound":"$undefined","forbidden":"$undefined","unauthorized":"$undefined"}]]}]
6:["$","$1","c",{"children":[["$","$Lf",null,{"Component":"$e","serverProvidedParams":{"searchParams":{},"params":{},"promises":["$@10","$@11"]}}],[["$","script","script-0",{"src":"/_next/static/chunks/2om5f4ruwp5wu.js","async":true,"nonce":"$undefined"}],["$","script","script-1",{"src":"/_next/static/chunks/1al9xmfsqi4s7.js","async":true,"nonce":"$undefined"}]],["$","$L12",null,{"children":["$","$13",null,{"name":"Next.MetadataOutlet","children":"$@14"}]}]]}]
15:[]
7:"$W15"
8:["$","$1","h",{"children":[["$","meta",null,{"name":"robots","content":"noindex"}],["$","$L16",null,{"children":"$L17"}],["$","div",null,{"hidden":true,"children":["$","$L18",null,{"children":["$","$13",null,{"name":"Next.Metadata","children":"$L19"}]}]}],null]}]
a:["$","link","0",{"rel":"stylesheet","href":"/_next/static/chunks/233ubfxe22ai9.css","precedence":"next","crossOrigin":"$undefined","nonce":"$undefined"}]
10:{}
11:"$6:props:children:0:props:serverProvidedParams:params"
17:[["$","meta","0",{"charSet":"utf-8"}],["$","meta","1",{"name":"viewport","content":"width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"}]]
1a:I[27201,["/_next/static/chunks/10un8k6wjmhhd.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/3dgrqbex-3-b2.js","/_next/static/chunks/081f9uqhut_q2.js","/_next/static/chunks/0b39sfkav7tdp.js","/_next/static/chunks/1ntn7efqc-iiw.js"],"IconMark"]
14:null
19:[["$","title","0",{"children":"Pay2Pay FinTech Retailer Platform"}],["$","meta","1",{"name":"description","content":"Enterprise Merchant Banking & Settlement Terminal"}],["$","link","2",{"rel":"manifest","href":"/site.webmanifest","crossOrigin":"$undefined"}],["$","link","3",{"rel":"shortcut icon","href":"/favicon.ico"}],["$","link","4",{"rel":"icon","href":"/favicon.ico?favicon.0dkwhtzwty2vg.ico","sizes":"256x256","type":"image/x-icon"}],["$","link","5",{"rel":"icon","href":"/favicon.ico"}],["$","link","6",{"rel":"icon","href":"/icon.png","type":"image/png"}],["$","link","7",{"rel":"icon","href":"/favicon-32x32.png","sizes":"32x32","type":"image/png"}],["$","link","8",{"rel":"icon","href":"/favicon-16x16.png","sizes":"16x16","type":"image/png"}],["$","link","9",{"rel":"apple-touch-icon","href":"/apple-touch-icon.png"}],["$","$L1a","10",{}]]
