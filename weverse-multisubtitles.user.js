// ==UserScript==
// @name         Weverse Multisubtitles (Fullscreen too)
// @namespace    http://tampermonkey.net/
// @version      4.0.1
// @description  Multi-language subtitles for Weverse with fullscreen support
// @author       araceliponce
// @match        *://weverse.io/*
// @match        *://m.weverse.io/*
// @grant        none
// @run-at       document-end
// @updateURL    https://raw.githubusercontent.com/araceliponce/tmpmonkey/main/weverse-multisubtitles.user.js
// @downloadURL  https://raw.githubusercontent.com/araceliponce/tmpmonkey/main/weverse-multisubtitles.user.js
// ==/UserScript==

(function () {
    "use strict";

    /************************************
     * CSS
     ************************************/

    function injectStyles() {
        if (document.getElementById("weverse-subtitle-styles")) return;

        const style = document.createElement("style");
        style.id = "weverse-subtitle-styles";

        style.textContent = `

            .pzp-pc .pzp-pc__subtitle-text{
                opacity:0;
            }

            #weverse-subtitle-box {
                position: fixed;
                left: 10px;
                right: 10px;
                bottom: 0px;
                height: 55svh;
                z-index: 2147483647;
                background: black;
                color: white;
                padding: 10px;
                border-radius: 10px;
                overflow-y: auto;
                display: grid;
                align-content: start;
                gap: 6px;
                font-family: sans-serif;
                font-size: 1.6rem;
                pointer-events:none;
            }

            #weverse-subtitle-box.weverse-fullscreen {
                position: absolute !important;
                z-index: 2147483647 !important;
                left: min(2rem,10vw);
                right: min(2rem,10vw);
                bottom: 5rem;
                display: grid !important;
                height: fit-content;
                background:transparent;
                font-size:1.1rem;
            }

            .weverse-subtitle-line {
                padding: 4px 8px;
                border-radius: 6px;
                text-align: center;
                font-weight: 500;
                background: rgba(0,0,0,.75);
                white-space: pre-line;
                width: fit-content;
                margin-inline: auto;
                pointer-events:all;
            }

            .weverse-subtitle-line:empty {
                display:none;
            }

            .weverse-subtitle-ja {
                color: white;
                font-size:1.2em;
            }

            .weverse-subtitle-en {
                color: #ffd54a;
            }

            .weverse-subtitle-ko {
                color: #66aaff;
            }

            .weverse-subtitle-unknown {
                color: white;
            }
        `;

        document.head.appendChild(style);
    }


    /************************************
     * Find video including dynamic DOM
     ************************************/

    function findAllVideos(root = document) {
        const videos = [];

        function scan(node) {
            if (!node) return;

            if (node.querySelectorAll) {
                videos.push(...node.querySelectorAll("video"));

                node.querySelectorAll("*").forEach(el => {
                    if (el.shadowRoot) {
                        scan(el.shadowRoot);
                    }
                });
            }
        }

        scan(root);

        return videos;
    }


    function waitForVideo(callback) {

        const check = () => {
            const video = findAllVideos()[0];

            if (video) {
                callback(video);
                return true;
            }

            return false;
        };


        if (check()) return;


        const observer = new MutationObserver(() => {
            if (check()) {
                observer.disconnect();
            }
        });


        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });
    }


    /************************************
     * Subtitle container
     ************************************/

    function createSubtitleBox() {

        let box = document.getElementById(
            "weverse-subtitle-box"
        );


        if (!box) {
            box = document.createElement("div");
            box.id = "weverse-subtitle-box";

            document.body.appendChild(box);
        }


        return box;
    }

    /************************************
     * Fullscreen handling
     ************************************/

    function setupFullscreen(box) {

        document.addEventListener(
            "fullscreenchange",
            () => {

                const fullscreenElement =
                    document.fullscreenElement;


                if (
                    fullscreenElement &&
                    fullscreenElement.classList.contains("pzp-pc")
                ) {

                    //enter full-screen

                    box.classList.add(
                        "weverse-fullscreen"
                    );

                    fullscreenElement.appendChild(box);


                } else {
                    //exit fullscreen

                    box.classList.remove(
                        "weverse-fullscreen"
                    );

                    document.body.appendChild(box);
                }

            }
        );
    }



    /************************************
     * Parse WebVTT subtitles
     ************************************/

    function parseVTT(text) {

        const result = [];

        let current = null;


        for (const line of text.split(/\r?\n/)) {


            if (line.includes("-->")) {

                const [start, end] =
                    line.split(" --> ");


                function toSeconds(value) {

                    const parts =
                        value.trim().split(":");


                    if (parts.length === 3) {
                        return (
                            Number(parts[0]) * 3600 +
                            Number(parts[1]) * 60 +
                            parseFloat(parts[2])
                        );
                    }


                    return (
                        Number(parts[0]) * 60 +
                        parseFloat(parts[1])
                    );
                }


                current = {
                    start: toSeconds(start),
                    end: toSeconds(end),
                    text: ""
                };


            } else if (
                line.trim() === ""
            ) {

                if (current) {
                    result.push(current);
                    current = null;
                }


            } else if (current) {

                current.text +=
                    (current.text ? "\n" : "") +
                    line.trim();
            }
        }


        if (current) {
            result.push(current);
        }


        return result;
    }



    async function loadSubtitle(url) {

        try {

            const response =
                await fetch(url);


            const text =
                await response.text();


            return parseVTT(text);


        } catch (error) {

            console.error(
                "[Weverse Subtitle] Failed loading",
                url,
                error
            );

            return [];
        }
    }



    /************************************
     * Track monitoring
     ************************************/

    function monitorTracks(video, box) {


        const subtitles = new Map();
        const elements = new Map();
        const processed = new Set();



        async function handleTrack(track) {


            if (
                !track.src ||
                processed.has(track)
            ) {
                return;
            }


            processed.add(track);


            const lang =
                track.srclang || "unknown";



            if (!elements.has(lang)) {


                const div =
                    document.createElement("div");


                div.className =
                    `weverse-subtitle-line weverse-subtitle-${lang}`;


                box.appendChild(div);


                elements.set(
                    lang,
                    div
                );
            }



            const data =
                await loadSubtitle(track.src);


            subtitles.set(
                lang,
                data
            );
        }



        function scanTracks() {

            video
                .querySelectorAll("track")
                .forEach(handleTrack);
        }



        const observer =
            new MutationObserver(
                mutations => {


                    for (const mutation of mutations) {


                        if (
                            mutation.type === "childList"
                        ) {
                            scanTracks();
                        }


                        if (
                            mutation.type === "attributes"
                        ) {

                            processed.delete(
                                mutation.target
                            );

                            handleTrack(
                                mutation.target
                            );
                        }
                    }

                }
            );



        observer.observe(
            video,
            {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: [
                    "src",
                    "srclang"
                ]
            }
        );


        scanTracks();



        video.addEventListener(
            "timeupdate",
            () => {

                const time =
                    video.currentTime;


                subtitles.forEach(
                    (items, lang) => {


                        const div =
                            elements.get(lang);


                        if (!div) return;


                        const active =
                            items.find(
                                sub =>
                                    time >= sub.start &&
                                    time <= sub.end
                            );


                        div.textContent =
                            active
                                ? active.text
                                : "";
                    }
                );

            }
        );
    }


    /************************************
      * Start
      ************************************/

    injectStyles();


    waitForVideo(video => {

        console.log(
            "[Weverse Subtitle] Video found:",
            video
        );


        const box =
            createSubtitleBox();


        setupFullscreen(box);


        monitorTracks(
            video,
            box
        );

    });


})();
