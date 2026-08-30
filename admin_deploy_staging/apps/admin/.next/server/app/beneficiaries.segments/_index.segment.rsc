1:"$Sreact.fragment"
2:I[479520,["/_next/static/chunks/10un8k6wjmhhd.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/3dgrqbex-3-b2.js","/_next/static/chunks/081f9uqhut_q2.js","/_next/static/chunks/0b39sfkav7tdp.js","/_next/static/chunks/1ntn7efqc-iiw.js"],""]
5:I[374901,["/_next/static/chunks/10un8k6wjmhhd.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/3dgrqbex-3-b2.js","/_next/static/chunks/081f9uqhut_q2.js","/_next/static/chunks/0b39sfkav7tdp.js","/_next/static/chunks/1ntn7efqc-iiw.js"],"default"]
6:I[339756,["/_next/static/chunks/10un8k6wjmhhd.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/3dgrqbex-3-b2.js","/_next/static/chunks/081f9uqhut_q2.js","/_next/static/chunks/0b39sfkav7tdp.js","/_next/static/chunks/1ntn7efqc-iiw.js"],"default"]
7:I[837457,["/_next/static/chunks/10un8k6wjmhhd.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/3dgrqbex-3-b2.js","/_next/static/chunks/081f9uqhut_q2.js","/_next/static/chunks/0b39sfkav7tdp.js","/_next/static/chunks/1ntn7efqc-iiw.js"],"default"]
8:I[666771,["/_next/static/chunks/10un8k6wjmhhd.js","/_next/static/chunks/3aiu8uhh9ykx9.js","/_next/static/chunks/3dgrqbex-3-b2.js","/_next/static/chunks/081f9uqhut_q2.js","/_next/static/chunks/0b39sfkav7tdp.js","/_next/static/chunks/1ntn7efqc-iiw.js","/_next/static/chunks/2om5f4ruwp5wu.js","/_next/static/chunks/1al9xmfsqi4s7.js"],"default"]
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
            0:{"rsc":["$","$1","c",{"children":[[["$","link","0",{"rel":"stylesheet","href":"/_next/static/chunks/233ubfxe22ai9.css","precedence":"next"}],["$","script","script-0",{"src":"/_next/static/chunks/10un8k6wjmhhd.js","async":true}],["$","script","script-1",{"src":"/_next/static/chunks/3aiu8uhh9ykx9.js","async":true}],["$","script","script-2",{"src":"/_next/static/chunks/3dgrqbex-3-b2.js","async":true}],["$","script","script-3",{"src":"/_next/static/chunks/081f9uqhut_q2.js","async":true}],["$","script","script-4",{"src":"/_next/static/chunks/0b39sfkav7tdp.js","async":true}],["$","script","script-5",{"src":"/_next/static/chunks/1ntn7efqc-iiw.js","async":true}]],["$","html",null,{"lang":"en","className":"dark","suppressHydrationWarning":true,"style":{"overflowX":"hidden","maxWidth":"100vw"},"children":["$","body",null,{"className":"antialiased min-h-screen bg-slate-950 text-slate-100","suppressHydrationWarning":true,"style":{"overflowX":"hidden","maxWidth":"100vw"},"children":[["$","$L2",null,{"id":"form-input-sanitizer","strategy":"afterInteractive","dangerouslySetInnerHTML":{"__html":"$3"}}],"$L4"]}]}]]}],"isPartial":false,"staleTime":300,"varyParams":null,"buildId":"clEZJ4pbFzWARUP91Z3Ut"}
4:["$","$L5",null,{"children":["$","$L6",null,{"parallelRouterKey":"children","template":["$","$L7",null,{}],"notFound":[["$","$L8",null,{}],[]]}]}]
