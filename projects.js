/* =========================================================
   PROJECTS CONFIGURATION (Scenes, Floors, Models, Landmarks)
========================================================= */
(function () {
    const urlParams = new URLSearchParams(window.location.search);
    const requestedProject = urlParams.get("project") || "khawalid-20";

    window.MAAZAR_PROJECT_ID = requestedProject;
    window.MAAZAR_DEFAULT_PROJECT = "khawalid-20";

    window.MAAZAR_PROJECTS = {
        "khawalid-20": {
            id: "khawalid-20",
            name: "Khawalid 20",
            name_ar: "خوالد 20",
            title: "Khawalid 20 Residential",
            title_ar: "خوالد 20 السكني",
            logo: "01 copy.png",
            logoClass: "brand-logo brand-logo-20",
            lat: 24.682417,
            lng: 46.669167,
            hint: "Tap a place to see distance & time from Khawalid 20",
            hint_ar: "اضغط على مكان لمعرفة المسافة والوقت من خوالد 20",
            sceneMenu: ["exterior", "night"],
            scenes: {
                exterior: {
                    label: "Day view",
                    label_ar: "منظر نهاري",
                    path: "exterior/day",
                    camera: "bird",
                    still: false,
                    showUnitsOverlay: true,
                },
                night: {
                    label: "Night view",
                    label_ar: "منظر ليلي",
                    path: "exterior/night",
                    camera: "bird",
                    still: false,
                    showUnitsOverlay: true,
                },
            },
            floors: [
                { key: "LG", name: "Basement", label: "Basement", ar: "القبو", amenities: true },
                { key: "GF", name: "Ground Floor", label: "Ground", ar: "الدور الأرضي" },
                { key: "1", name: "1st Floor", label: "First", ar: "الدور الأول" },
                { key: "2", name: "2nd Floor", label: "Second", ar: "الدور الثاني" },
                { key: "RF", name: "Roof Floor", label: "Roof", ar: "الملحق / السطح" },
            ],
            models: {
                units: "",
                occluder: "",
            },
            landmarks: [],
            prox: [
                { min: "3 min", en: "from Panorama Mall", ar: "من بانوراما مول" },
                { min: "5 min", en: "from King Faisal Specialist Hospital", ar: "من مستشفى الملك فيصل التخصصي" },
                { min: "8 min", en: "from Kingdom Centre", ar: "من برج المملكة" },
                { min: "12 min", en: "from the Diplomatic Quarter", ar: "من الحي الدبلوماسي" },
                { min: "30 min", en: "from King Khalid Int'l Airport", ar: "من مطار الملك خالد الدولي" },
            ],
        },
    };

    window.MAAZAR_PROJECT = window.MAAZAR_PROJECTS[requestedProject] || window.MAAZAR_PROJECTS["khawalid-20"];
})();
