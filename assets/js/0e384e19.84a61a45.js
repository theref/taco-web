"use strict";(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[671],{3905:(e,t,r)=>{r.d(t,{Zo:()=>l,kt:()=>y});var n=r(7294);function a(e,t,r){return t in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r,e}function i(e,t){var r=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);t&&(n=n.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),r.push.apply(r,n)}return r}function o(e){for(var t=1;t<arguments.length;t++){var r=null!=arguments[t]?arguments[t]:{};t%2?i(Object(r),!0).forEach((function(t){a(e,t,r[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(r)):i(Object(r)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(r,t))}))}return e}function s(e,t){if(null==e)return{};var r,n,a=function(e,t){if(null==e)return{};var r,n,a={},i=Object.keys(e);for(n=0;n<i.length;n++)r=i[n],t.indexOf(r)>=0||(a[r]=e[r]);return a}(e,t);if(Object.getOwnPropertySymbols){var i=Object.getOwnPropertySymbols(e);for(n=0;n<i.length;n++)r=i[n],t.indexOf(r)>=0||Object.prototype.propertyIsEnumerable.call(e,r)&&(a[r]=e[r])}return a}var c=n.createContext({}),p=function(e){var t=n.useContext(c),r=t;return e&&(r="function"==typeof e?e(t):o(o({},t),e)),r},l=function(e){var t=p(e.components);return n.createElement(c.Provider,{value:t},e.children)},u={inlineCode:"code",wrapper:function(e){var t=e.children;return n.createElement(n.Fragment,{},t)}},d=n.forwardRef((function(e,t){var r=e.components,a=e.mdxType,i=e.originalType,c=e.parentName,l=s(e,["components","mdxType","originalType","parentName"]),d=p(r),y=a,h=d["".concat(c,".").concat(y)]||d[y]||u[y]||i;return r?n.createElement(h,o(o({ref:t},l),{},{components:r})):n.createElement(h,o({ref:t},l))}));function y(e,t){var r=arguments,a=t&&t.mdxType;if("string"==typeof e||a){var i=r.length,o=new Array(i);o[0]=d;var s={};for(var c in t)hasOwnProperty.call(t,c)&&(s[c]=t[c]);s.originalType=e,s.mdxType="string"==typeof e?e:a,o[1]=s;for(var p=2;p<i;p++)o[p]=r[p];return n.createElement.apply(null,o)}return n.createElement.apply(null,r)}d.displayName="MDXCreateElement"},9881:(e,t,r)=>{r.r(t),r.d(t,{assets:()=>c,contentTitle:()=>o,default:()=>u,frontMatter:()=>i,metadata:()=>s,toc:()=>p});var n=r(7462),a=(r(7294),r(3905));const i={slug:"/",sidebar_position:1},o="Getting Started",s={unversionedId:"intro",id:"intro",title:"Getting Started",description:"nucypher-ts is a typescript library to allow developers to interact with core Nucypher functionality within the browser.",source:"@site/docs/intro.md",sourceDirName:".",slug:"/",permalink:"/nucypher-ts/",draft:!1,tags:[],version:"current",sidebarPosition:1,frontMatter:{slug:"/",sidebar_position:1},sidebar:"tutorialSidebar",next:{title:"Conditions",permalink:"/nucypher-ts/Conditions.md"}},c={},p=[{value:"Installation",id:"installation",level:2},{value:"Basic Usage",id:"basic-usage",level:2},{value:"Contribution",id:"contribution",level:2}],l={toc:p};function u(e){let{components:t,...r}=e;return(0,a.kt)("wrapper",(0,n.Z)({},l,r,{components:t,mdxType:"MDXLayout"}),(0,a.kt)("h1",{id:"getting-started"},"Getting Started"),(0,a.kt)("p",null,(0,a.kt)("inlineCode",{parentName:"p"},"nucypher-ts")," is a typescript library to allow developers to interact with core Nucypher functionality within the browser.\nIt is in active development, so please be aware that things may change!"),(0,a.kt)("p",null,"If you have any questions, don't hesitate to create an issue on ",(0,a.kt)("a",{parentName:"p",href:"https://github.com/nucypher/nucypher-ts"},"Github"),", or come and say hello in our ",(0,a.kt)("a",{parentName:"p",href:"https://discord.gg/RwjHbgA7uQ"},"Discord"),"."),(0,a.kt)("h2",{id:"installation"},"Installation"),(0,a.kt)("p",null,"Install into your project with:"),(0,a.kt)("pre",null,(0,a.kt)("code",{parentName:"pre"},"yarn install @nucypher/nucypher-ts\n")),(0,a.kt)("h2",{id:"basic-usage"},"Basic Usage"),(0,a.kt)("p",null,"You can quickly start using Threshold Decryption in the browser.\nThis requires an active connection to the Ethereum network, in this example we will use the ",(0,a.kt)("a",{parentName:"p",href:"https://docs.metamask.io/guide/ethereum-provider.html"},"MetaMask Provider"),"."),(0,a.kt)("pre",null,(0,a.kt)("code",{parentName:"pre",className:"language-js"},"import detectEthereumProvider from '@metamask/detect-provider';\nimport generateTDecEntities from '@nucypher/nucypher-ts'\n\nconst provider = await detectEthereumProvider();\nconst [encrypter, decrypter, _, _] =\n      await generateTDecEntities(\n        3, // threshold\n        5, // shares\n        provider, // eth provider, here we use metamask\n        'example', // label your configuration\n        new Date(), // start date\n        new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // end date (in 30 days)\n        'https://porter-ibex.nucypher.community'\n      );\n\nconst plaintext = 'plaintext-message';\nconst encryptedMessage = encrypter.encryptMessage(plaintext);\n\nconst decryptedMessage = await decrypter.retrieveAndDecrypt([\n      encryptedMessage\n    ]);\n")),(0,a.kt)("h2",{id:"contribution"},"Contribution"),(0,a.kt)("p",null,"Please see our ",(0,a.kt)("a",{parentName:"p",href:"/nucypher-ts/Contributing.md"},"Contribution Guide")))}u.isMDXComponent=!0}}]);