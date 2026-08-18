// ==UserScript==
// @name         Oboe Style Override
// @namespace    https://github.com/araceliponce/tmpmonkey
// @version      1.0.2
// @description  Custom styles for Oboe
// @author       araceliponce
// @match        https://oboe.com/*
// @grant        none
// @updateURL    https://raw.githubusercontent.com/araceliponce/tmpmonkey/main/oboe-style-override.user.js
// @downloadURL  https://raw.githubusercontent.com/araceliponce/tmpmonkey/main/oboe-style-override.user.js
// ==/UserScript==

(function () {
    'use strict';

    const style = document.createElement('style');

    style.textContent = `
        #main-content-scroll-area,
        #main-chapter-scroll-area {
            background: #252122 !important;
        }

        #main-chapter-scroll-area,
        .font-light,
        h2,
        .prose table:not(.not-prose *) th,
        .prose table:not(.not-prose *) td {
            color: white;
        }

        /* .text-right are my messages, 
        textarea is the main textbox,
        [aria-haspopup="dialog"] are highlighted short texts you can tap */
        .text-right .font-light,
        [aria-haspopup="dialog"].font-light,
        textarea.font-light{
            color: #252122;
        }

        .prose strong:not(.not-prose *) {
            color: currentColor !important;
        }

        .bg-sidebar {
            background-color: hsl(300, 3.3%, 11.8%);
        }

        .to-tan-light {
            --tw-gradient-to: 0;
        }

        /* when hovering the alternatives */
        @media (hover: hover) and (pointer: fine) {
          .followUpRow:hover {
            background-color: #ab442d;
          }
        }
    `;

    document.head.appendChild(style);
})();
