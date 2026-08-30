1:"$Sreact.fragment"
2:I[479520,["/_next/static/chunks/10un8k6wjmhhd.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/3dgrqbex-3-b2.js","/_next/static/chunks/081f9uqhut_q2.js","/_next/static/chunks/0b39sfkav7tdp.js","/_next/static/chunks/1ntn7efqc-iiw.js"],""]
b:I[168027,["/_next/static/chunks/10un8k6wjmhhd.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/3dgrqbex-3-b2.js","/_next/static/chunks/081f9uqhut_q2.js","/_next/static/chunks/0b39sfkav7tdp.js","/_next/static/chunks/1ntn7efqc-iiw.js"],"default",1]
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
            0:{"P":null,"c":["","aeps","devices"],"q":"","i":false,"f":[[["",{"children":["(dashboard)",{"children":["aeps",{"children":["devices",{"children":["__PAGE__",{}]}]}]},"$undefined","$undefined",4]},"$undefined","$undefined",24],[["$","$1","c",{"children":[[["$","link","0",{"rel":"stylesheet","href":"/_next/static/chunks/233ubfxe22ai9.css","precedence":"next","crossOrigin":"$undefined","nonce":"$undefined"}],["$","script","script-0",{"src":"/_next/static/chunks/10un8k6wjmhhd.js","async":true,"nonce":"$undefined"}],["$","script","script-1",{"src":"/_next/static/chunks/3aiu8uhh9ykx9.js","async":true,"nonce":"$undefined"}],["$","script","script-2",{"src":"/_next/static/chunks/3dgrqbex-3-b2.js","async":true,"nonce":"$undefined"}],["$","script","script-3",{"src":"/_next/static/chunks/081f9uqhut_q2.js","async":true,"nonce":"$undefined"}],["$","script","script-4",{"src":"/_next/static/chunks/0b39sfkav7tdp.js","async":true,"nonce":"$undefined"}],["$","script","script-5",{"src":"/_next/static/chunks/1ntn7efqc-iiw.js","async":true,"nonce":"$undefined"}]],["$","html",null,{"lang":"en","className":"dark","suppressHydrationWarning":true,"style":{"overflowX":"hidden","maxWidth":"100vw"},"children":["$","body",null,{"className":"antialiased min-h-screen bg-slate-950 text-slate-100","suppressHydrationWarning":true,"style":{"overflowX":"hidden","maxWidth":"100vw"},"children":[["$","$L2",null,{"id":"form-input-sanitizer","strategy":"afterInteractive","dangerouslySetInnerHTML":{"__html":"$3"}}],"$L4"]}]}]]}],{"children":["$L5",{"children":["$L6",{"children":["$L7",{"children":["$L8",{},null,false,null]},null,false,"$@9"]},null,false,"$@9"]},null,false,null]},null,false,null],"$La",false]],"m":"$undefined","G":["$b",["$Lc"]],"S":true,"h":null,"s":"$undefined","l":"$undefined","p":"$undefined","d":"$undefined","b":"clEZJ4pbFzWARUP91Z3Ut"}
d:I[374901,["/_next/static/chunks/10un8k6wjmhhd.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/3dgrqbex-3-b2.js","/_next/static/chunks/081f9uqhut_q2.js","/_next/static/chunks/0b39sfkav7tdp.js","/_next/static/chunks/1ntn7efqc-iiw.js"],"default"]
e:I[339756,["/_next/static/chunks/10un8k6wjmhhd.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/3dgrqbex-3-b2.js","/_next/static/chunks/081f9uqhut_q2.js","/_next/static/chunks/0b39sfkav7tdp.js","/_next/static/chunks/1ntn7efqc-iiw.js"],"default"]
f:I[837457,["/_next/static/chunks/10un8k6wjmhhd.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/3dgrqbex-3-b2.js","/_next/static/chunks/081f9uqhut_q2.js","/_next/static/chunks/0b39sfkav7tdp.js","/_next/static/chunks/1ntn7efqc-iiw.js"],"default"]
10:I[666771,["/_next/static/chunks/10un8k6wjmhhd.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/3dgrqbex-3-b2.js","/_next/static/chunks/081f9uqhut_q2.js","/_next/static/chunks/0b39sfkav7tdp.js","/_next/static/chunks/1ntn7efqc-iiw.js","/_next/static/chunks/2om5f4ruwp5wu.js","/_next/static/chunks/1al9xmfsqi4s7.js"],"default"]
11:I[339756,["/_next/static/chunks/10un8k6wjmhhd.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/3dgrqbex-3-b2.js","/_next/static/chunks/081f9uqhut_q2.js","/_next/static/chunks/0b39sfkav7tdp.js","/_next/static/chunks/1ntn7efqc-iiw.js"],"LoadingBoundaryProvider"]
12:I[626083,["/_next/static/chunks/10un8k6wjmhhd.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/3dgrqbex-3-b2.js","/_next/static/chunks/081f9uqhut_q2.js","/_next/static/chunks/0b39sfkav7tdp.js","/_next/static/chunks/1ntn7efqc-iiw.js","/_next/static/chunks/3wgkeprt020w4.js","/_next/static/chunks/3vncrde0iitq-.js"],"default"]
13:I[92825,["/_next/static/chunks/10un8k6wjmhhd.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/3dgrqbex-3-b2.js","/_next/static/chunks/081f9uqhut_q2.js","/_next/static/chunks/0b39sfkav7tdp.js","/_next/static/chunks/1ntn7efqc-iiw.js"],"ClientSegmentRoot"]
14:I[752159,["/_next/static/chunks/10un8k6wjmhhd.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/3dgrqbex-3-b2.js","/_next/static/chunks/081f9uqhut_q2.js","/_next/static/chunks/0b39sfkav7tdp.js","/_next/static/chunks/1ntn7efqc-iiw.js","/_next/static/chunks/3wgkeprt020w4.js"],"default"]
15:I[368683,["/_next/static/chunks/10un8k6wjmhhd.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/3dgrqbex-3-b2.js","/_next/static/chunks/081f9uqhut_q2.js","/_next/static/chunks/0b39sfkav7tdp.js","/_next/static/chunks/1ntn7efqc-iiw.js","/_next/static/chunks/3wgkeprt020w4.js","/_next/static/chunks/09mnbhqw-8328.js","/_next/static/chunks/1al9xmfsqi4s7.js"],"default"]
17:I[347257,["/_next/static/chunks/10un8k6wjmhhd.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/3dgrqbex-3-b2.js","/_next/static/chunks/081f9uqhut_q2.js","/_next/static/chunks/0b39sfkav7tdp.js","/_next/static/chunks/1ntn7efqc-iiw.js"],"ClientPageRoot"]
18:I[811076,["/_next/static/chunks/10un8k6wjmhhd.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/3dgrqbex-3-b2.js","/_next/static/chunks/081f9uqhut_q2.js","/_next/static/chunks/0b39sfkav7tdp.js","/_next/static/chunks/1ntn7efqc-iiw.js","/_next/static/chunks/3wgkeprt020w4.js","/_next/static/chunks/1uucomcb-2_r3.js"],"default"]
1b:I[897367,["/_next/static/chunks/10un8k6wjmhhd.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/3dgrqbex-3-b2.js","/_next/static/chunks/081f9uqhut_q2.js","/_next/static/chunks/0b39sfkav7tdp.js","/_next/static/chunks/1ntn7efqc-iiw.js"],"OutletBoundary"]
1c:"$Sreact.suspense"
1f:I[897367,["/_next/static/chunks/10un8k6wjmhhd.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/3dgrqbex-3-b2.js","/_next/static/chunks/081f9uqhut_q2.js","/_next/static/chunks/0b39sfkav7tdp.js","/_next/static/chunks/1ntn7efqc-iiw.js"],"ViewportBoundary"]
21:I[897367,["/_next/static/chunks/10un8k6wjmhhd.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/3dgrqbex-3-b2.js","/_next/static/chunks/081f9uqhut_q2.js","/_next/static/chunks/0b39sfkav7tdp.js","/_next/static/chunks/1ntn7efqc-iiw.js"],"MetadataBoundary"]
4:["$","$Ld",null,{"children":["$","$Le",null,{"parallelRouterKey":"children","error":"$undefined","errorStyles":"$undefined","errorScripts":"$undefined","template":["$","$Lf",null,{}],"templateStyles":"$undefined","templateScripts":"$undefined","notFound":[["$","$L10",null,{}],[]],"forbidden":"$undefined","unauthorized":"$undefined"}]}]
5:["$","$L11",null,{"loading":[["$","$L12","l",{}],[],[["$","script","script-0",{"src":"/_next/static/chunks/3vncrde0iitq-.js","async":true}]]],"children":["$","$1","c",{"children":[[["$","script","script-0",{"src":"/_next/static/chunks/3wgkeprt020w4.js","async":true,"nonce":"$undefined"}]],["$","$L13",null,{"Component":"$14","slots":{"children":["$","$Le",null,{"parallelRouterKey":"children","error":"$undefined","errorStyles":"$undefined","errorScripts":"$undefined","template":["$","$Lf",null,{}],"templateStyles":"$undefined","templateScripts":"$undefined","notFound":[["$","$L15",null,{}],[]],"forbidden":"$undefined","unauthorized":"$undefined"}]},"serverProvidedParams":{"params":{},"promises":["$@16"]}}]]}]}]
6:["$","$1","c",{"children":[null,["$","$Le",null,{"parallelRouterKey":"children","error":"$undefined","errorStyles":"$undefined","errorScripts":"$undefined","template":["$","$Lf",null,{}],"templateStyles":"$undefined","templateScripts":"$undefined","notFound":"$undefined","forbidden":"$undefined","unauthorized":"$undefined"}]]}]
7:["$","$1","c",{"children":[null,["$","$Le",null,{"parallelRouterKey":"children","error":"$undefined","errorStyles":"$undefined","errorScripts":"$undefined","template":["$","$Lf",null,{}],"templateStyles":"$undefined","templateScripts":"$undefined","notFound":"$undefined","forbidden":"$undefined","unauthorized":"$undefined"}]]}]
8:["$","$1","c",{"children":[["$","$L17",null,{"Component":"$18","serverProvidedParams":{"searchParams":{},"params":"$5:props:children:props:children:1:props:serverProvidedParams:params","promises":["$@19","$@1a"]}}],[["$","script","script-0",{"src":"/_next/static/chunks/1uucomcb-2_r3.js","async":true,"nonce":"$undefined"}]],["$","$L1b",null,{"children":["$","$1c",null,{"name":"Next.MetadataOutlet","children":"$@1d"}]}]]}]
1e:[]
9:"$W1e"
a:["$","$1","h",{"children":[null,["$","$L1f",null,{"children":"$L20"}],["$","div",null,{"hidden":true,"children":["$","$L21",null,{"children":["$","$1c",null,{"name":"Next.Metadata","children":"$L22"}]}]}],null]}]
c:["$","link","0",{"rel":"stylesheet","href":"/_next/static/chunks/233ubfxe22ai9.css","precedence":"next","crossOrigin":"$undefined","nonce":"$undefined"}]
16:"$5:props:children:props:children:1:props:serverProvidedParams:params"
19:{}
1a:"$5:props:children:props:children:1:props:serverProvidedParams:params"
20:[["$","meta","0",{"charSet":"utf-8"}],["$","meta","1",{"name":"viewport","content":"width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"}]]
23:I[27201,["/_next/static/chunks/10un8k6wjmhhd.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/3dgrqbex-3-b2.js","/_next/static/chunks/081f9uqhut_q2.js","/_next/static/chunks/0b39sfkav7tdp.js","/_next/static/chunks/1ntn7efqc-iiw.js"],"IconMark"]
1d:null
22:[["$","title","0",{"children":"Pay2Pay FinTech Retailer Platform"}],["$","meta","1",{"name":"description","content":"Enterprise Merchant Banking & Settlement Terminal"}],["$","link","2",{"rel":"manifest","href":"/site.webmanifest","crossOrigin":"$undefined"}],["$","link","3",{"rel":"shortcut icon","href":"/favicon.ico"}],["$","link","4",{"rel":"icon","href":"/favicon.ico?favicon.0dkwhtzwty2vg.ico","sizes":"256x256","type":"image/x-icon"}],["$","link","5",{"rel":"icon","href":"/favicon.ico"}],["$","link","6",{"rel":"icon","href":"/icon.png","type":"image/png"}],["$","link","7",{"rel":"icon","href":"/favicon-32x32.png","sizes":"32x32","type":"image/png"}],["$","link","8",{"rel":"icon","href":"/favicon-16x16.png","sizes":"16x16","type":"image/png"}],["$","link","9",{"rel":"apple-touch-icon","href":"/apple-touch-icon.png"}],["$","$L23","10",{}]]
