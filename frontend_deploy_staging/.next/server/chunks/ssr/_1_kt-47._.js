module.exports=[872123,(a,b,c)=>{let{createClientModuleProxy:d}=a.r(211857);a.n(d("[project]/node_modules/next/dist/client/script.js <module evaluation>"))},944536,(a,b,c)=>{let{createClientModuleProxy:d}=a.r(211857);a.n(d("[project]/node_modules/next/dist/client/script.js"))},411153,a=>{"use strict";a.i(872123);var b=a.i(944536);a.n(b)},371618,(a,b,c)=>{b.exports=a.r(411153)},923115,a=>{"use strict";a.s(["default",()=>b]);let b=(0,a.i(211857).registerClientReference)(function(){throw Error("Attempted to call the default export of [project]/src/app/providers.tsx <module evaluation> from the server, but it's on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.")},"[project]/src/app/providers.tsx <module evaluation>","default")},36459,a=>{"use strict";a.s(["default",()=>b]);let b=(0,a.i(211857).registerClientReference)(function(){throw Error("Attempted to call the default export of [project]/src/app/providers.tsx from the server, but it's on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.")},"[project]/src/app/providers.tsx","default")},862752,a=>{"use strict";a.i(923115);var b=a.i(36459);a.n(b)},827572,a=>{"use strict";var b=a.i(907997),c=a.i(371618),d=a.i(862752);a.s(["default",0,function({children:a}){return(0,b.jsx)("html",{lang:"en",className:"dark",suppressHydrationWarning:!0,style:{overflowX:"hidden",maxWidth:"100vw"},children:(0,b.jsxs)("body",{className:"antialiased min-h-screen bg-slate-950 text-slate-100",suppressHydrationWarning:!0,style:{overflowX:"hidden",maxWidth:"100vw"},children:[(0,b.jsx)(c.default,{id:"form-input-sanitizer",strategy:"afterInteractive",dangerouslySetInnerHTML:{__html:`
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
            `}}),(0,b.jsx)(d.default,{children:a})]})})},"metadata",0,{icons:{icon:[{url:"/favicon.ico"},{url:"/icon.png",type:"image/png"},{url:"/favicon-32x32.png",sizes:"32x32",type:"image/png"},{url:"/favicon-16x16.png",sizes:"16x16",type:"image/png"}],shortcut:"/favicon.ico",apple:"/apple-touch-icon.png"},manifest:"/site.webmanifest",title:"Pay2Pay FinTech Retailer Platform",description:"Enterprise Merchant Banking & Settlement Terminal"},"viewport",0,{width:"device-width",initialScale:1,maximumScale:1,userScalable:!1}])},650645,a=>{a.n(a.i(827572))}];

//# sourceMappingURL=_1_kt-47._.js.map