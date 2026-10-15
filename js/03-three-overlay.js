/* =========================================================
 PART 1.5: THREE.JS OVERLAY (FLOORS / UNITS) + OCCLUDER SYNCED WITH FRAMES
  ========================================================= */

/* Baked render cameras — one per render set, written by tools/bake-camera.js --write.
   A scene names the camera its photos were rendered with: SCENES[*].camera. */
const BAKED_CAMERAS = {
    bird: { // FBX_CAM/BIRD_CAMERA.fbx — Day: bird's-eye orbit (Day Final) — a Corona camera, so the lens is set here
        fov: 26.2, // vertical, degrees — matched to the renders by eye (the FBX carries no lens: Corona Camera003)
        shift: 0.62126, // vertical lens shift, fraction of the frame height — the camera is baked level; it looked 16.13° down
        positionkeys: [
            [0, [10029.99, 2731.62, -15047.94]],
            [1, [8308.8, 2731.62, -14913.42]],
            [2, [6629.99, 2731.62, -14510.99]],
            [3, [5035.57, 2731.62, -13849.04]],
            [4, [3564.64, 2731.62, -12945.24]],
            [5, [2252.33, 2731.62, -11823.42]],
            [6, [1130.51, 2731.62, -10511.11]],
            [7, [226.72, 2731.62, -9040.18]],
            [8, [-435.24, 2731.62, -7445.76]],
            [9, [-837.67, 2731.62, -5766.95]],
            [10, [-972.18, 2731.62, -4045.76]],
            [11, [-837.66, 2731.62, -2324.58]],
            [12, [-435.24, 2731.62, -645.77]],
            [13, [226.72, 2731.62, 948.65]],
            [14, [1130.51, 2731.62, 2419.58]],
            [15, [2252.33, 2731.62, 3731.89]],
            [16, [3564.65, 2731.62, 4853.71]],
            [17, [5035.57, 2731.62, 5757.51]],
            [18, [6630, 2731.62, 6419.46]],
            [19, [8308.8, 2731.62, 6821.89]],
            [20, [10029.99, 2731.62, 6956.41]],
            [21, [11751.17, 2731.62, 6821.89]],
            [22, [13429.99, 2731.62, 6419.47]],
            [23, [15024.4, 2731.62, 5757.51]],
            [24, [16495.34, 2731.62, 4853.72]],
            [25, [17807.64, 2731.62, 3731.9]],
            [26, [18929.47, 2731.62, 2419.59]],
            [27, [19833.26, 2731.62, 948.66]],
            [28, [20495.22, 2731.62, -645.77]],
            [29, [20897.65, 2731.62, -2324.57]],
            [30, [21032.17, 2731.62, -4045.76]],
            [31, [20897.65, 2731.62, -5766.95]],
            [32, [20495.22, 2731.62, -7445.76]],
            [33, [19833.27, 2731.62, -9040.18]],
            [34, [18929.47, 2731.62, -10511.11]],
            [35, [17807.65, 2731.62, -11823.41]],
            [36, [16495.34, 2731.62, -12945.24]],
            [37, [15024.41, 2731.62, -13849.04]],
            [38, [13429.99, 2731.62, -14511]],
            [39, [11751.18, 2731.62, -14913.42]],
        ],
        rotation_XYZW: [
            0, 0.9999885, 0, -0.0047993,
            0, 0.99648, 0, -0.0838306,
            0, 0.9867587, 0, -0.1621952,
            0, 0.9709184, 0, -0.2394108,
            0, 0.949089, 0, -0.315008,
            0, 0.9214396, 0, -0.3885217,
            0, 0.8881779, 0, -0.4594997,
            0, 0.8495454, 0, -0.5275155,
            0, 0.8058079, 0, -0.5921771,
            0, 0.7572464, 0, -0.6531293,
            0, -0.7041628, 0, 0.7100386,
            0, -0.6468907, 0, 0.7625827,
            0, -0.5857821, 0, 0.8104686,
            0, -0.5211906, 0, 0.8534403,
            0, -0.4534822, 0, 0.8912653,
            0, -0.3830481, 0, 0.9237284,
            0, -0.3103005, 0, 0.9506385,
            0, -0.2356667, 0, 0.9718339,
            0, -0.1595737, 0, 0.987186,
            0, -0.0824475, 0, 0.9965954,
            0, -0.0047195, 0, 0.9999889,
            0, 0.0731506, 0, 0.9973209,
            0, 0.1506954, 0, 0.9885802,
            0, 0.2274613, 0, 0.9737871,
            0, 0.3029928, 0, 0.9529928,
            0, 0.3768203, 0, 0.9262864,
            0, 0.448466, 0, 0.8937999,
            0, 0.517458, 0, 0.8557086,
            0, 0.5833441, 0, 0.8122251,
            0, 0.6456966, 0, 0.7635941,
            0, 0.7041061, 0, 0.7100948,
            0, 0.7581683, 0, 0.6520589,
            0, 0.8075074, 0, 0.5898574,
            0, 0.851792, 0, 0.5238802,
            0, 0.8907237, 0, 0.4545451,
            0, 0.9240342, 0, 0.3823099,
            0, 0.9514947, 0, 0.3076652,
            0, 0.9729248, 0, 0.231122,
            0, 0.9881963, 0, 0.1531929,
            0, 0.9972297, 0, 0.0743835,
        ],
    },
    main: { // FBX_CAM/MAIN_CAMERA.fbx — the earlier street-level Day orbit (day-v2) — no scene uses it any more
        fov: 48.0259, // vertical, degrees
        positionkeys: [
            [0, [16587.64, 477.72, -3921.79]],
            [1, [16502.84, 477.72, -5006.83]],
            [2, [16249.15, 477.72, -6065.15]],
            [3, [15831.85, 477.72, -7070.27]],
            [4, [15262.1, 477.72, -7997.55]],
            [5, [14554.9, 477.72, -8824.82]],
            [6, [13727.62, 477.72, -9532.02]],
            [7, [12800.35, 477.72, -10101.77]],
            [8, [11795.22, 477.72, -10519.07]],
            [9, [10736.91, 477.72, -10772.76]],
            [10, [9651.87, 477.72, -10857.56]],
            [11, [8566.83, 477.72, -10772.76]],
            [12, [7508.51, 477.72, -10519.07]],
            [13, [6503.39, 477.72, -10101.77]],
            [14, [5576.12, 477.72, -9532.02]],
            [15, [4748.84, 477.72, -8824.82]],
            [16, [4041.64, 477.72, -7997.54]],
            [17, [3471.89, 477.72, -7070.27]],
            [18, [3054.59, 477.72, -6065.15]],
            [19, [2800.9, 477.72, -5006.83]],
            [20, [2716.1, 477.72, -3921.79]],
            [21, [2800.9, 477.72, -2836.76]],
            [22, [3054.59, 477.72, -1778.44]],
            [23, [3471.89, 477.72, -773.32]],
            [24, [4041.64, 477.72, 153.96]],
            [25, [4748.84, 477.72, 981.24]],
            [26, [5576.11, 477.72, 1688.43]],
            [27, [6503.39, 477.72, 2258.19]],
            [28, [7508.51, 477.72, 2675.49]],
            [29, [8566.84, 477.72, 2929.18]],
            [30, [9651.87, 477.72, 3013.98]],
            [31, [10736.91, 477.72, 2929.18]],
            [32, [11795.23, 477.72, 2675.49]],
            [33, [12800.35, 477.72, 2258.19]],
            [34, [13727.63, 477.72, 1688.44]],
            [35, [14554.9, 477.72, 981.24]],
            [36, [15262.1, 477.72, 153.96]],
            [37, [15831.85, 477.72, -773.31]],
            [38, [16249.15, 477.72, -1778.44]],
            [39, [16502.84, 477.72, -2836.76]],
        ],
        rotation_XYZW: [
            -0.0008332, 0.6934873, 0.000802, 0.7204679,
            -0.0007668, 0.7517058, 0.000874, 0.6594976,
            -0.0006924, 0.8048164, 0.0009389, 0.5935227,
            -0.0006112, 0.8522697, 0.0009958, 0.5231013,
            -0.0005241, 0.8935949, 0.0010434, 0.4488728,
            -0.0004326, 0.9284098, 0.0010808, 0.3715559,
            -0.0003381, 0.9564417, 0.0011077, 0.2919212,
            -0.0002424, 0.9775391, 0.0011241, 0.2107509,
            -0.0001468, 0.9916707, 0.0011305, 0.1287941,
            -0.0000528, 0.9989061, 0.0011276, 0.0467479,
            0.0000388, 0.9993958, 0.0011161, -0.0347386,
            0.000127, 0.9933585, 0.0010965, -0.1150551,
            0.0002112, 0.9810652, 0.00107, -0.1936746,
            0.0002912, 0.9628151, 0.0010378, -0.2701591,
            0.0003667, 0.9389247, 0.0010004, -0.3441211,
            0.0004375, 0.9097222, 0.0009586, -0.4152162,
            0.0005038, 0.8755384, 0.0009129, -0.4831474,
            0.0005655, 0.8366981, 0.000864, -0.5476634,
            0.0006231, 0.7935081, 0.0008125, -0.6085589,
            0.0006768, 0.746255, 0.0007588, -0.6656594,
            -0.0007268, -0.6952133, -0.0007029, 0.7188028,
            -0.0007731, -0.6406572, -0.000645, 0.7678264,
            -0.000816, -0.5828459, -0.0005853, 0.8125821,
            -0.0008558, -0.5220189, -0.0005238, 0.8529333,
            -0.0008925, -0.45841, -0.0004603, 0.8887402,
            -0.0009258, -0.392259, -0.0003948, 0.9198543,
            -0.0009559, -0.3238152, -0.0003271, 0.9461198,
            -0.0009824, -0.253336, -0.0002573, 0.9673778,
            -0.0010054, -0.1810848, -0.0001851, 0.983467,
            -0.0010247, -0.1073312, -0.0001106, 0.9942228,
            -0.0010397, -0.0323571, -0.0000337, 0.9994758,
            -0.0010499, 0.0435134, 0.0000457, 0.9990523,
            -0.0010549, 0.1199094, 0.0001274, 0.9927843,
            -0.0010542, 0.1964411, 0.0002112, 0.980515,
            -0.001047, 0.2726846, 0.0002968, 0.9621029,
            -0.0010325, 0.3481579, 0.0003835, 0.9374352,
            -0.0010101, 0.4223141, 0.0004706, 0.9064489,
            -0.0009791, 0.4945585, 0.0005571, 0.8691436,
            -0.0009393, 0.5642632, 0.000642, 0.8255942,
            -0.0008907, 0.630788, 0.0007241, 0.7759544,
        ],
    },
    aerial: { // FBX_CAM/CAMERA.fbx — the first Night set's aerial orbit — no scene uses it since the Oct 2026 re-render (Night Final is the bird's-eye orbit)
        fov: 25.8, // vertical, degrees — matched to the renders by eye (the FBX lens gives 26.23°)
        positionkeys: [
            [0, [22493.11, 9471.26, -3920.49]],
            [1, [22341.41, 9471.26, -5861.57]],
            [2, [21887.57, 9471.26, -7754.85]],
            [3, [21141.05, 9471.26, -9552.96]],
            [4, [20121.79, 9471.26, -11211.81]],
            [5, [18856.65, 9471.26, -12691.77]],
            [6, [17376.69, 9471.26, -13956.9]],
            [7, [15717.84, 9471.26, -14976.16]],
            [8, [13919.72, 9471.26, -15722.68]],
            [9, [12026.44, 9471.26, -16176.52]],
            [10, [10085.38, 9471.26, -16328.22]],
            [11, [8144.3, 9471.26, -16176.52]],
            [12, [6251.02, 9471.26, -15722.68]],
            [13, [4452.91, 9471.26, -14976.16]],
            [14, [2794.07, 9471.26, -13956.9]],
            [15, [1314.11, 9471.26, -12691.76]],
            [16, [48.97, 9471.26, -11211.8]],
            [17, [-970.29, 9471.26, -9552.95]],
            [18, [-1716.81, 9471.26, -7754.84]],
            [19, [-2170.64, 9471.26, -5861.56]],
            [20, [-2322.35, 9471.26, -3920.49]],
            [21, [-2170.64, 9471.26, -1979.42]],
            [22, [-1716.8, 9471.26, -86.13]],
            [23, [-970.28, 9471.26, 1711.97]],
            [24, [48.98, 9471.26, 3370.82]],
            [25, [1314.12, 9471.26, 4850.78]],
            [26, [2794.07, 9471.26, 6115.92]],
            [27, [4452.92, 9471.26, 7135.17]],
            [28, [6251.04, 9471.26, 7881.7]],
            [29, [8144.32, 9471.26, 8335.54]],
            [30, [10085.38, 9471.26, 8487.24]],
            [31, [12026.46, 9471.26, 8335.54]],
            [32, [13919.74, 9471.26, 7881.69]],
            [33, [15717.85, 9471.26, 7135.17]],
            [34, [17376.7, 9471.26, 6115.91]],
            [35, [18856.66, 9471.26, 4850.77]],
            [36, [20121.79, 9471.26, 3370.82]],
            [37, [21141.05, 9471.26, 1711.97]],
            [38, [21887.57, 9471.26, -86.15]],
            [39, [22341.41, 9471.26, -1979.43]],
        ],
        rotation_XYZW: [
            -0.2259665, 0.6706636, 0.2264504, 0.6692307,
            -0.2074759, 0.7210451, 0.2433841, 0.6146641,
            -0.18774, 0.7669768, 0.2588216, 0.5563378,
            -0.1668934, 0.8081785, 0.2727068, 0.4945959,
            -0.1450373, 0.8444129, 0.2849402, 0.4298141,
            -0.1222842, 0.87547, 0.2954129, 0.3623949,
            -0.0987776, 0.9011586, 0.3040538, 0.2927584,
            -0.0746698, 0.9213191, 0.310814, 0.2213373,
            -0.0501173, 0.9358177, 0.3156932, 0.1485641,
            -0.0252619, 0.9445586, 0.3186925, 0.0748727,
            -0.0002375, 0.9474988, 0.3197584, 0.0007037,
            0.0248028, 0.9446318, 0.3188348, -0.0734847,
            0.049704, 0.9359568, 0.3159704, -0.1472314,
            0.0743296, 0.9215104, 0.3112116, -0.220093,
            0.0985343, 0.9013822, 0.3045514, -0.2916324,
            0.1221562, 0.8757012, 0.2959847, -0.3614116,
            0.1450362, 0.8446237, 0.2855565, -0.4289905,
            0.167024, 0.808339, 0.2733358, -0.4939418,
            -0.1879994, -0.7670571, -0.2594313, 0.5558553,
            -0.207854, -0.7210171, -0.2439439, 0.6143472,
            -0.2264462, -0.670503, -0.2269325, 0.6690661,
            -0.2436197, -0.6158393, -0.20847, 0.7196747,
            -0.2592926, -0.5573579, -0.1887065, 0.765839,
            -0.2733961, -0.4954062, -0.1677789, 0.8072654,
            -0.2858185, -0.4303657, -0.1457933, 0.8437046,
            -0.2964404, -0.3626476, -0.12287, 0.8749359,
            -0.3051819, -0.2926832, -0.0991626, 0.9007593,
            -0.3119887, -0.2209179, -0.0748352, 0.9210092,
            -0.3168578, -0.1477986, -0.0500574, 0.9355485,
            -0.3197907, -0.0737722, -0.0249837, 0.9442814,
            -0.3207372, 0.0007065, 0.0002392, 0.9471679,
            -0.319647, 0.0751667, 0.0254465, 0.9442077,
            -0.316578, 0.149137, 0.0504737, 0.9354084,
            -0.3115876, 0.2221661, 0.0751769, 0.9208169,
            -0.3046806, 0.2938114, 0.0994061, 0.9005349,
            -0.295865, 0.3636318, 0.1229969, 0.8747043,
            -0.2851995, 0.4311884, 0.145792, 0.8434942,
            -0.2727655, 0.496058, 0.1676452, 0.8071063,
            -0.2586826, 0.5578375, 0.1884438, 0.7657607,
            -0.243061, 0.616153, 0.208089, 0.7197054,
        ],
    },
    top: { // FBX_CAM/GROUND_CAMERA.fbx — Ground floor: top view, one render — a Corona camera, so the lens is set here
        fov: 11.5, // vertical, degrees — matched to the renders by eye (the FBX carries no lens: Corona Camera004)
        positionkeys: [
            [0, [10017.85, 38374.4, -4128.9]],
        ],
        rotation_XYZW: [
            -1e-7, 0.7071068, 0.7071068, 1e-7,
        ],
    },
    tower2: { // FBX_CAM/TOWER2_CAMERA.fbx — Khawalid Tower 2: the Day + Night orbits — the render camera baked by the 3D team (Camera_yasser.fbx), position + rotation keys, the lens in the file, no tilt correction
        fov: 37.6494, // vertical, degrees
        positionkeys: [
            [0, [82471.83, 5500, -275494.02]],
            [1, [82305.77, 5500, -277326.66]],
            [2, [81854.27, 5500, -279110.52]],
            [3, [81127.23, 5500, -280800.93]],
            [4, [80144.22, 5500, -282356.49]],
            [5, [78931.05, 5500, -283740.16]],
            [6, [77517.72, 5500, -284918.63]],
            [7, [75937.84, 5500, -285862.16]],
            [8, [74229.56, 5500, -286546.14]],
            [9, [72434.86, 5500, -286952.49]],
            [10, [70598.59, 5500, -287072.49]],
            [11, [68765.94, 5500, -286906.47]],
            [12, [66982.09, 5500, -286454.96]],
            [13, [65291.69, 5500, -285727.93]],
            [14, [63736.11, 5500, -284744.9]],
            [15, [62352.46, 5500, -283531.74]],
            [16, [61173.98, 5500, -282118.41]],
            [17, [60230.46, 5500, -280538.53]],
            [18, [59546.46, 5500, -278830.25]],
            [19, [59140.11, 5500, -277035.55]],
            [20, [59020.1, 5500, -275199.27]],
            [21, [59186.16, 5500, -273366.63]],
            [22, [59637.67, 5500, -271582.74]],
            [23, [60364.7, 5500, -269892.36]],
            [24, [61347.72, 5500, -268336.77]],
            [25, [62560.89, 5500, -266953.15]],
            [26, [63974.22, 5500, -265774.66]],
            [27, [65554.1, 5500, -264831.15]],
            [28, [67262.37, 5500, -264147.14]],
            [29, [69057.09, 5500, -263740.77]],
            [30, [70893.35, 5500, -263620.8]],
            [31, [72725.99, 5500, -263786.84]],
            [32, [74509.85, 5500, -264238.33]],
            [33, [76200.25, 5500, -264965.41]],
            [34, [77755.83, 5500, -265948.39]],
            [35, [79139.48, 5500, -267161.55]],
            [36, [80317.95, 5500, -268574.93]],
            [37, [81261.47, 5500, -270154.81]],
            [38, [81945.47, 5500, -271863.09]],
            [39, [82351.82, 5500, -273657.76]],
        ],
        rotation_XYZW: [
            -0.1323886, 0.69618, 0.1330148, 0.6929024,
            -0.1218337, 0.7476946, 0.1430257, 0.6369089,
            -0.1105439, 0.7947721, 0.1522647, 0.5770034,
            -0.0985719, 0.8371229, 0.1606937, 0.513504,
            -0.0859495, 0.8744817, 0.1682381, 0.4467554,
            -0.0727196, 0.9065997, 0.1748122, 0.3771334,
            -0.0589495, 0.9332448, 0.1803464, 0.305048,
            -0.0447239, 0.9542117, 0.1848022, 0.2309284,
            -0.0301289, 0.9693286, 0.1881525, 0.155219,
            -0.015248, 0.97846, 0.1903722, 0.0783707,
            -0.0001661, 0.9815113, 0.1914021, 0.0008516,
            0.0150122, 0.9784312, 0.1911623, -0.0768372,
            0.0301762, 0.9691934, 0.1896864, -0.1541838,
            0.0452237, 0.9538208, 0.1869842, -0.2306895,
            0.0600413, 0.9323876, 0.1830339, -0.3058544,
            0.0745009, 0.905019, 0.1778223, -0.3791693,
            0.0884749, 0.8718883, 0.1713747, -0.4501263,
            0.1018532, 0.8332127, 0.1637591, -0.5182331,
            0.1145417, 0.7892514, 0.1550567, -0.5830264,
            0.1264597, 0.7402971, 0.1453508, -0.6440817,
            0.1375105, 0.6866843, 0.1347009, -0.7010073,
            0.1475787, 0.6288, 0.1231663, -0.7534329,
            0.156636, 0.5670414, 0.1108824, -0.8010208,
            0.1646505, 0.5018233, 0.0979572, -0.8434856,
            0.1715647, 0.4335811, 0.0844744, -0.880589,
            0.177322, 0.3627783, 0.0705259, -0.9121266,
            0.1818925, 0.2898906, 0.0562182, -0.9379329,
            0.1852892, 0.2153971, 0.0416657, -0.957881,
            0.1875379, 0.1397675, 0.0269699, -0.9718885,
            0.1886693, 0.0634558, 0.0122176, -0.9799122,
            0.1886804, -0.013083, -0.0025139, -0.9819482,
            0.1875438, -0.0893854, -0.0171402, -0.9780306,
            0.1853371, -0.1650025, -0.0315853, -0.968208,
            0.182107, -0.2395131, -0.0457892, -0.9525617,
            0.1778561, -0.3125017, -0.0596863, -0.9312075,
            0.172588, -0.3835576, -0.0732039, -0.9042887,
            0.1663285, -0.4522745, -0.086271, -0.8719747,
            0.1591306, -0.5182564, -0.0988312, -0.834458,
            0.1510489, -0.5811313, -0.1108394, -0.7919503,
            0.1421296, -0.6405496, -0.1222552, -0.7446805,
        ],
    },
    tower2planGF: { // posed in tools/bake-camera.js — Tower 2: ground floor plan, one render — the camera fitted to it
        fov: 6.9206, // vertical, degrees — fitted to the render with the camera pose (CAMERAS table)
        positionkeys: [
            [0, [70933.9, 38400, -275492.7]],
        ],
        rotation_XYZW: [
            -0.7071068, 0, 0, 0.7071068,
        ],
    },
    tower2plan1: { // posed in tools/bake-camera.js — Tower 2: 1st floor plan, one render — the camera fitted to it
        fov: 7.0334, // vertical, degrees — fitted to the render with the camera pose (CAMERAS table)
        positionkeys: [
            [0, [70942.3, 38400, -275527.8]],
        ],
        rotation_XYZW: [
            -0.7071068, 0, 0, 0.7071068,
        ],
    },
    tower2plan2: { // posed in tools/bake-camera.js — Tower 2: 2nd floor plan, one render — the camera fitted to it (a copy of the 1st floor's render)
        fov: 7.2422, // vertical, degrees — fitted to the render with the camera pose (CAMERAS table)
        positionkeys: [
            [0, [70942.3, 38400, -275527.8]],
        ],
        rotation_XYZW: [
            -0.7071068, 0, 0, 0.7071068,
        ],
    },
    tower2plan3: { // posed in tools/bake-camera.js — Tower 2: 3rd floor plan, one render — the camera fitted to it (a copy of the 1st floor's render)
        fov: 7.2422, // vertical, degrees — fitted to the render with the camera pose (CAMERAS table)
        positionkeys: [
            [0, [70942.3, 38400, -275527.8]],
        ],
        rotation_XYZW: [
            -0.7071068, 0, 0, 0.7071068,
        ],
    },
    tower2plan4: { // posed in tools/bake-camera.js — Tower 2: 4th floor plan, one render — the camera fitted to it
        fov: 7.0334, // vertical, degrees — fitted to the render with the camera pose (CAMERAS table)
        positionkeys: [
            [0, [70890, 38400, -275559.1]],
        ],
        rotation_XYZW: [
            -0.7071068, 0, 0, 0.7071068,
        ],
    },
    tower2plan5: { // posed in tools/bake-camera.js — Tower 2: 5th floor plan, one render — the camera fitted to it (a copy of the 4th floor's render)
        fov: 7.0334, // vertical, degrees — fitted to the render with the camera pose (CAMERAS table)
        positionkeys: [
            [0, [70890, 38400, -275559.1]],
        ],
        rotation_XYZW: [
            -0.7071068, 0, 0, 0.7071068,
        ],
    },
    tower2plan6: { // posed in tools/bake-camera.js — Tower 2: 6th floor plan, one render — the camera fitted to it (a copy of the 4th floor's render)
        fov: 7.0334, // vertical, degrees — fitted to the render with the camera pose (CAMERAS table)
        positionkeys: [
            [0, [70890, 38400, -275559.1]],
        ],
        rotation_XYZW: [
            -0.7071068, 0, 0, 0.7071068,
        ],
    },
    tower2plan7: { // posed in tools/bake-camera.js — Tower 2: 7th floor plan, one render — the camera fitted to it (a copy of the 4th floor's render)
        fov: 7.0334, // vertical, degrees — fitted to the render with the camera pose (CAMERAS table)
        positionkeys: [
            [0, [70890, 38400, -275559.1]],
        ],
        rotation_XYZW: [
            -0.7071068, 0, 0, 0.7071068,
        ],
    },
    tower2plan8: { // posed in tools/bake-camera.js — Tower 2: 8th floor plan, one render — the camera fitted to it (a copy of the 4th floor's render)
        fov: 7.0334, // vertical, degrees — fitted to the render with the camera pose (CAMERAS table)
        positionkeys: [
            [0, [70890, 38400, -275559.1]],
        ],
        rotation_XYZW: [
            -0.7071068, 0, 0, 0.7071068,
        ],
    },
    tower2plan9: { // posed in tools/bake-camera.js — Tower 2: 9th floor plan (the flats and the two-level townhouses), one render — the camera fitted to it
        fov: 7.6902, // vertical, degrees — fitted to the render with the camera pose (CAMERAS table)
        positionkeys: [
            [0, [70846.9, 38400, -275481.4]],
        ],
        rotation_XYZW: [
            -0.7071068, 0, 0, 0.7071068,
        ],
    },
};

/* --------------------------------------- */



/* The 3D overlay drawn over the renders (config.js UNITS_FBX: one mesh
   per floor or per unit, see FLOOR VOLUMES further down) and the building
   shell that masks it (OCCLUDER_FBX). Leave both empty and the whole 3D
   layer (overlay, 3D view, hide toggle) stays dormant. After replacing
   either file — or a render camera — re-bake the camera keys with
   node tools/bake-camera.js --write  (see README.md). */
// The project's models (projects.js → models); config.js UNITS_FBX / OCCLUDER_FBX stand in for
// a project entry that has no `models` at all.
const THREE_ASSETS = {
    units: PROJECT.models && "units" in PROJECT.models ? PROJECT.models.units || "" : (window.MAAZAR_CONFIG && window.MAAZAR_CONFIG.UNITS_FBX) || "",
    occluder: PROJECT.models && "occluder" in PROJECT.models ? PROJECT.models.occluder || "" : (window.MAAZAR_CONFIG && window.MAAZAR_CONFIG.OCCLUDER_FBX) || "",
};
/* 3ds Max writes these files Z-up (GlobalSettings UpAxis = 2) and three's
   FBXLoader does not convert axes, so a Z-up root is turned into the Y-up
   world the baked camera keys live in: (x, y, z) -> (x, z, -y) — the same
   rotation tools/bake-camera.js applies to the camera. config.js
   MODELS_UP_AXIS says which export this is ("Z" or "Y").
   Units, likewise: the world is in centimetres, and the loader only notes
   the file's unit (GlobalSettings UnitScaleFactor — cm per unit: 1 for a
   cm export, 100 for metres) in userData, so a scene exported in metres
   is scaled up here; the bake tool converts the camera the same way. */
const MODELS_UP_AXIS = String((window.MAAZAR_CONFIG && window.MAAZAR_CONFIG.MODELS_UP_AXIS) || "Y").toUpperCase();
function applyModelUpAxis(obj) {
    if (MODELS_UP_AXIS === "Z") obj.rotation.x = -Math.PI / 2;
    const unit = Number(obj.userData && obj.userData.unitScaleFactor) || 1;
    if (unit !== 1) obj.scale.multiplyScalar(unit);
    obj.updateMatrixWorld(true);
}

let threeScene, threeCamera, threeRenderer;
let ambientLight = null, dirLight = null;
let unitsModel = null;
let overlayHasFloors = false; // the overlay model carries floor volumes (see FLOOR VOLUMES)
let unitsOverlayHidden = false; // "Hide Units" / "Hide Floors" button state
let occluderModel = null;
let occluderSettled = false; // the shell has loaded (or failed to): tidyUnitGeometry waits for it
let threeReady = false;
let threeRaycaster = null;
let threeMouse = null;
let hoveredUnitMesh = null;
let unitFocusActive = false; // true while a hover "focus" (dim the rest) is animating

/* Is the building shell drawn — as an invisible depth mask — under the photo overlay?
   · unit boxes: yes on the exterior orbits (it hides the far-side units), no on a
     floor scene (the floor's units sit under it)
   · floor volumes: never. Together they are the building's whole mass and sort
     themselves out (see setupFloorMesh); the one-box shell would only hide the
     storeys that are set back inside it — the second floor and roof from the rear. */
function shellMasksOverlay() {
    if (overlayHasFloors) return false;
    return !(SCENES[currentScene] && SCENES[currentScene].unitFloor);
}

// The camera the active scene's photos were rendered with (SCENES[*].camera).
function bakedCamera() {
    const scene = SCENES[currentScene];
    const cam = BAKED_CAMERAS[scene && scene.camera] || BAKED_CAMERAS[Object.keys(BAKED_CAMERAS)[0]];
    if (!cam.byFrame) cam.byFrame = new Map(cam.positionkeys);
    return cam;
}

/* The floor volumes only sit on a scene's photos when drawn through the
   camera those photos were rendered with. A scene whose camera is not
   baked yet (no BAKED_CAMERAS entry — the bird's-eye Day until its FBX
   is exported) shows no overlay and ignores hover / click on the
   building; the 3D view, which has no photo to line up with, still works. */
function sceneOverlayAligned(sceneKey = currentScene) {
    const scene = SCENES[sceneKey];
    return !!(scene && scene.showUnitsOverlay && BAKED_CAMERAS[scene.camera]);
}
// Whether the floor volumes are on screen right now (Hide Floors toggle, scene, 3D view).
function floorsVisible() {
    return !unitsOverlayHidden && (is3DMode || sceneOverlayAligned());
}
function syncFloorsVisible() {
    if (unitsModel) unitsModel.visible = floorsVisible();
}

function getBackgroundCoverRect() {
    const viewer = document.getElementById("frameViewer");
    const img = document.getElementById("backgroundImage");

    const vw = viewer.clientWidth;
    const vh = viewer.clientHeight;

    // fallback لو الصورة لسه محملتش
    const iw = img.naturalWidth || 2048;
    const ih = img.naturalHeight || 909;

    const imageAspect = iw / ih;

    // نفس حساب object-fit: cover بالظبط
    const scale = Math.max(vw / iw, vh / ih);

    const width = iw * scale;
    const height = ih * scale;

    const left = (vw - width) / 2;
    const top = (vh - height) / 2;

    return {
        left,
        top,
        width,
        height,
        aspect: imageAspect,
    };
}

