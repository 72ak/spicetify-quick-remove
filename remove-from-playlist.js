// NAME: Quick Remove from playlist
// DESCRIPTION: Remove songs from a playlist in a single click

(function RemoveFromPlaylist() {
    if (!(Spicetify.React && Spicetify.ReactDOM && Spicetify.Platform?.PlaylistAPI && Spicetify.Platform?.History && Spicetify.Tippy)) {
        setTimeout(RemoveFromPlaylist, 100);
        return;
    }

    const RemoveButton = Spicetify.React.memo(({ trackUri, trackUid, classList }) => {
        const [tippyInstance, setTippyInstance] = Spicetify.React.useState(null);
        const buttonRef = Spicetify.React.useRef(null);

        const handleClick = async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const path = Spicetify.Platform.History.location.pathname;
            if (!path.startsWith('/playlist/')) return;
            
            try {
               
                const playlistId = path.split('/playlist/')[1].split('?')[0];
                const playlistUri = `spotify:playlist:${playlistId}`;

               
                const payload = [{ uri: trackUri }];
                if (trackUid) payload[0].uid = trackUid;

                await Spicetify.Platform.PlaylistAPI.remove(playlistUri, payload);
                Spicetify.showNotification("Removed from playlist");
            } catch (err) {
                console.error("REMOVE-BTN Error:", err, "URI:", trackUri, "UID:", trackUid);
                Spicetify.showNotification("Error: Check console (Ctrl+Shift+I)");
            }
        };

        Spicetify.React.useEffect(() => {
            if (buttonRef.current && !tippyInstance) {
                const instance = Spicetify.Tippy(buttonRef.current, {
                    ...Spicetify.TippyProps,
                    content: "Remove from Playlist"
                });
                setTippyInstance(instance);
            }
            return () => tippyInstance?.destroy();
        }, [tippyInstance]);

        if (!Spicetify.Platform.History.location.pathname.startsWith('/playlist/')) return null;

        return Spicetify.React.createElement(
            "button",
            {
                ref: buttonRef,
                className: classList,
                onClick: handleClick,
                style: { marginRight: "12px", display: "flex", alignItems: "center", background: "transparent", border: "none" }
            },
            Spicetify.React.createElement(
                "span",
                { className: "Wrapper-sm-only Wrapper-small-only" },
                Spicetify.React.createElement("svg", {
                    role: "img",
                    height: "16",
                    width: "16",
                    viewBox: "0 0 16 16",
                    style: { fill: "var(--spice-subtext)", cursor: "pointer" },
                    onMouseOver: (e) => e.currentTarget.style.fill = "#ff4136", 
                    onMouseOut: (e) => e.currentTarget.style.fill = "var(--spice-subtext)",
                    dangerouslySetInnerHTML: {
                        __html: `<path d="M3 4H13V14C13 14.5523 12.5523 15 12 15H4C3.44772 15 3 14.5523 3 14V4ZM5 4V2C5 1.44772 5.44772 1 6 1H10C10.5523 1 11 1.44772 11 2V4H14V5H2V4H5ZM6 2V4H10V2H6ZM5 6V13H6V6H5ZM8 6V13H9V6H8ZM11 6V13H12V6H11Z"></path>`
                    }
                })
            )
        );
    });

    function findVal(object, key, max = 10) {
        if (object[key] !== undefined || !max) return object[key];
        for (const k in object) {
            if (object[k] && typeof object[k] === "object") {
                const value = findVal(object[k], key, --max);
                if (value !== undefined) return value;
            }
        }
        return undefined;
    }

    const observer = new MutationObserver(mutationList => {
        mutationList.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType !== 1) return; 

                const nodeMatch =
                    node.attributes?.role?.value === "row"
                        ? node.firstChild?.lastChild
                        : node.firstChild?.attributes?.role?.value === "row"
                        ? node.firstChild?.firstChild.lastChild
                        : null;

                if (nodeMatch) {
                    const entryPoint = nodeMatch.querySelector(":scope > button:not(:last-child):has([data-encore-id]), :scope > button[aria-haspopup]");

                    if (entryPoint) {
                        const reactPropsKey = Object.keys(node).find(key => key.startsWith("__reactProps$"));
                        const rowReactProps = node[reactPropsKey];

                        if (!rowReactProps) return;

                        let uri;
                        let uid; 
                        
                        try {
                            if (rowReactProps?.children?.ref?.current) {
                                const refCurrent = rowReactProps.children.ref.current;
                                const fiberKey = Object.keys(refCurrent).find(k => k.startsWith("__reactFiber$"));
                                if (fiberKey) {
                                    const pendingProps = refCurrent[fiberKey]?.return?.return?.return?.pendingProps;
                                    if (pendingProps?.uri?.startsWith("spotify:")) {
                                        uri = pendingProps.uri;
                                        uid = pendingProps.uid;
                                    }
                                }
                            }
                        } catch (_) {}
                        
                        if (!uri) uri = findVal(rowReactProps, "uri");
                        if (!uid) uid = findVal(rowReactProps, "uid");
                        
                        if (!uri) return;

                        if (nodeMatch.querySelector('.spicetify-remove-wrapper')) return;

                        const wrapper = document.createElement("div");
                        wrapper.className = "spicetify-remove-wrapper";
                        wrapper.style.display = "contents";

                        let insertedElement;
                        if (entryPoint.parentNode === nodeMatch) {
                            insertedElement = nodeMatch.insertBefore(wrapper, entryPoint);
                        } else {
                            insertedElement = nodeMatch.insertBefore(wrapper, nodeMatch.firstChild);
                        }

                        Spicetify.ReactDOM.render(
                            Spicetify.React.createElement(RemoveButton, {
                                trackUri: uri,
                                trackUid: uid, 
                                classList: entryPoint.classList
                            }),
                            insertedElement
                        );
                    }
                }
            });
        });
    });

    observer.observe(document, { subtree: true, childList: true });
})();
