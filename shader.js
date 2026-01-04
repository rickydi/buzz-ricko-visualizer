const fragmentShader = `
uniform float iTime;
uniform vec2 iResolution;
uniform float uBass;
uniform float uMid;
uniform float uTreble;
uniform float uSensitivity;
uniform float uSpeed;

#define PI 3.14159265359
#define TAU 6.28318530718

// Fonctions utilitaires
float hash(float n) { return fract(sin(n) * 43758.5453123); }
float hash21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
mat2 rot(float a) { float s = sin(a), c = cos(a); return mat2(c, -s, s, c); }
vec3 pal(float t, vec3 a, vec3 b, vec3 c, vec3 d) { return a + b * cos(TAU * (c * t + d)); }

// Bruit Simplex amélioré pour effet aquarelle
float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * f * (f * (f * 6.0 - 15.0) + 10.0); // Quintic interpolation plus douce
    return mix(mix(hash21(i), hash21(i + vec2(1,0)), f.x),
               mix(hash21(i + vec2(0,1)), hash21(i + vec2(1,1)), f.x), f.y);
}

// FBM aquarelle avec plus d'octaves et variation
float fbmWater(vec2 p, float t) {
    float v = 0.0, a = 0.5;
    mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
    for (int i = 0; i < 6; i++) {
        v += a * noise(p + t * 0.05);
        p = m * p + t * 0.02;
        a *= 0.5;
    }
    return v;
}

// Bruit de Voronoi pour effet cellulaire aquarelle
float voronoi(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float minDist = 1.0;
    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 neighbor = vec2(float(x), float(y));
            vec2 point = hash21(i + neighbor) * 0.5 + 0.5;
            float d = length(neighbor + point - f);
            minDist = min(minDist, d);
        }
    }
    return minDist;
}

// Effet de diffusion d'encre dans l'eau
vec3 inkDiffusion(vec2 uv, float t, float b) {
    vec2 p = uv;

    // Mouvement organique lent
    p += vec2(
        fbmWater(uv * 2.0 + t * 0.1, t),
        fbmWater(uv * 2.0 + 100.0 - t * 0.1, t)
    ) * 0.4;

    // Couches de diffusion
    float ink1 = fbmWater(p * 3.0, t * 0.3);
    float ink2 = fbmWater(p * 2.0 + 50.0, t * 0.2);
    float ink3 = fbmWater(p * 4.0 - 30.0, t * 0.4);

    // Mélange aquarelle avec bords doux
    ink1 = smoothstep(0.3, 0.7, ink1);
    ink2 = smoothstep(0.2, 0.8, ink2);
    ink3 = smoothstep(0.4, 0.6, ink3);

    return vec3(ink1, ink2, ink3);
}

// Générateur de motifs aquarelle
vec3 getPattern(vec2 uv, float t, int id, float b, float tr) {
    float fid = float(id);
    float h = hash(fid);

    // Symétrie kaléidoscope plus fluide
    float segments = floor(3.0 + hash(fid * 12.3) * 5.0);

    float angle = atan(uv.y, uv.x);
    float radius = length(uv);

    // Rotation très lente et organique
    float rotSpeed = (hash(fid * 2.1) - 0.5) * 0.2 * uSpeed;
    angle += t * rotSpeed;

    // Symétrie douce
    float segmentAngle = TAU / segments;
    float a = mod(angle, segmentAngle);
    a = abs(a - segmentAngle * 0.5);

    vec2 p = vec2(cos(a), sin(a)) * radius;

    float val = 0.0;
    int type = int(mod(fid, 30.0));

    // Déformation liquide intense style aquarelle
    vec2 q = p;
    float flow1 = fbmWater(p * 2.0 + t * 0.1, t);
    float flow2 = fbmWater(p * 1.5 - t * 0.08, t);
    q += vec2(flow1, flow2) * 0.6;

    // Deuxième couche de déformation pour plus de fluidité
    q += vec2(
        sin(flow1 * TAU + t * 0.2),
        cos(flow2 * TAU - t * 0.15)
    ) * 0.3;

    // Effets aquarelle selon le type
    if (type == 0) { // Encre diffuse
        float ink = fbmWater(q * 2.5, t * 0.2);
        float edges = fbmWater(q * 5.0 + 20.0, t * 0.3);
        val = ink + edges * 0.3;
        val = smoothstep(0.2, 0.8, val);
    } else if (type == 1) { // Gouttes qui se mélangent
        float drops = voronoi(q * 3.0 + t * 0.1);
        float blend = fbmWater(q * 2.0, t * 0.2);
        val = mix(drops, blend, 0.6);
        val = pow(val, 0.8);
    } else if (type == 2) { // Marbre liquide
        float marble = fbmWater(p * 1.5 + fbmWater(p * 3.0 + t * 0.05, t) * 2.0, t * 0.1);
        val = sin(marble * PI * 3.0) * 0.5 + 0.5;
    } else if (type == 3) { // Flux d'eau colorée
        float stream = sin(q.x * 4.0 + fbmWater(q * 3.0, t) * 3.0 + t * 0.3);
        val = stream * 0.5 + 0.5;
        val = smoothstep(0.1, 0.9, val);
    } else if (type == 4) { // Nuages de pigment
        val = fbmWater(q * 3.0, t * 0.15) * fbmWater(q * 2.0 + 50.0, t * 0.1);
        val = pow(val, 0.6);
    } else if (type == 5) { // Fleurs d'encre
        float r = length(q);
        float an = atan(q.y, q.x);
        float petals = sin(an * 5.0 + fbmWater(q * 2.0, t) * 2.0);
        float bloom = sin(r * 6.0 - t * 0.3 + petals * 2.0);
        val = bloom * 0.5 + 0.5;
        val = smoothstep(0.2, 0.8, val);
    } else if (type == 6) { // Ondulations douces
        float wave1 = sin(q.x * 3.0 + fbmWater(q, t) * 4.0 + t * 0.2);
        float wave2 = sin(q.y * 3.0 + fbmWater(q + 30.0, t) * 4.0 + t * 0.25);
        val = (wave1 + wave2) * 0.25 + 0.5;
    } else if (type == 7) { // Tourbillon aquarelle
        float an = atan(q.y, q.x) + length(q) * 3.0;
        float swirl = sin(an * 2.0 - t * 0.2 + fbmWater(q * 2.0, t) * 2.0);
        val = swirl * 0.5 + 0.5;
        val = smoothstep(0.15, 0.85, val);
    } else if (type == 8) { // Taches qui fusionnent
        float blobs = 1.0 - voronoi(q * 2.5 + fbmWater(q, t) * 0.5);
        float diffuse = fbmWater(q * 3.0 + t * 0.1, t);
        val = blobs * 0.7 + diffuse * 0.3;
        val = smoothstep(0.1, 0.9, val);
    } else if (type == 9) { // Nébuleuse liquide
        float neb = fbmWater(q * 2.0 - t * 0.1, t);
        float detail = fbmWater(q * 5.0 + t * 0.15, t);
        val = neb * 0.8 + detail * 0.2;
    }
    // 10-14: Vagues et ondulations
    else if (type == 10) { // Vagues horizontales
        val = sin(q.y * 8.0 + fbmWater(q * 2.0, t) * 3.0 + t * 0.5) * 0.5 + 0.5;
    } else if (type == 11) { // Vagues verticales
        val = sin(q.x * 8.0 + fbmWater(q * 2.0, t) * 3.0 - t * 0.4) * 0.5 + 0.5;
    } else if (type == 12) { // Vagues croisées
        float w1 = sin(q.x * 5.0 + t * 0.3);
        float w2 = sin(q.y * 5.0 - t * 0.25);
        val = (w1 * w2) * 0.5 + 0.5;
    } else if (type == 13) { // Vagues circulaires
        val = sin(length(q) * 12.0 - t * 2.0 + fbmWater(q, t) * 2.0) * 0.5 + 0.5;
    } else if (type == 14) { // Vagues spirales
        float an = atan(q.y, q.x);
        val = sin(an * 3.0 + length(q) * 8.0 - t * 1.5) * 0.5 + 0.5;
    }
    // 15-19: Kaléidoscopes
    else if (type == 15) { // Kaléido simple
        float ka = mod(atan(q.y, q.x), PI / 4.0);
        val = sin(ka * 10.0 + length(q) * 5.0 + t) * 0.5 + 0.5;
    } else if (type == 16) { // Kaléido rotatif
        float ka = mod(atan(q.y, q.x) + t * 0.2, PI / 6.0);
        val = fbmWater(vec2(ka, length(q)) * 3.0, t) ;
    } else if (type == 17) { // Kaléido plasma
        float ka = mod(atan(q.y, q.x), PI / 5.0);
        vec2 kp = vec2(cos(ka), sin(ka)) * length(q);
        val = sin(kp.x * 8.0 + t) * sin(kp.y * 8.0 + t * 0.9) * 0.5 + 0.5;
    } else if (type == 18) { // Kaléido fluide
        float ka = mod(atan(q.y, q.x), PI / 3.0);
        vec2 kp = vec2(cos(ka), sin(ka)) * length(q);
        kp += fbmWater(kp * 2.0, t) * 0.3;
        val = fbmWater(kp * 4.0, t * 0.5);
    } else if (type == 19) { // Kaléido géométrique
        float ka = mod(atan(q.y, q.x), PI / 8.0);
        val = step(0.5, sin(ka * 20.0 + length(q) * 10.0 + t));
        val = smoothstep(0.0, 0.1, val);
    }
    // 20-24: Effets spéciaux
    else if (type == 20) { // Tunnel infini
        float tunnel = 1.0 / (length(q) + 0.1);
        val = sin(tunnel * 3.0 + atan(q.y, q.x) * 2.0 - t * 2.0) * 0.5 + 0.5;
    } else if (type == 21) { // Hypnotique
        val = sin(atan(q.y, q.x) * 8.0 + sin(length(q) * 5.0 + t) * 3.0 - t) * 0.5 + 0.5;
    } else if (type == 22) { // Cellules vivantes
        float cells = voronoi(q * 4.0 + t * 0.2);
        val = 1.0 - cells;
        val = pow(val, 1.5);
    } else if (type == 23) { // Diamant
        float diamond = abs(q.x) + abs(q.y);
        val = sin(diamond * 8.0 - t * 2.0 + sin(atan(q.y, q.x) * 4.0) * 2.0) * 0.5 + 0.5;
    } else if (type == 24) { // Morphing
        float morph = fbmWater(q * 2.0 + t * 0.1, t);
        vec2 mp = q + vec2(cos(morph * TAU), sin(morph * TAU)) * 0.4;
        val = sin(mp.x * 5.0 + t) * sin(mp.y * 5.0 + t * 0.8) * 0.5 + 0.5;
    }
    // 25-29: Abstraits
    else if (type == 25) { // Aurora
        val = fbmWater(q * 1.5 + vec2(t * 0.1, 0.0), t) * fbmWater(q * 2.0 - vec2(0.0, t * 0.08), t);
        val = pow(val, 0.5);
    } else if (type == 26) { // Fractal simple
        vec2 z = q * 2.0;
        for (int i = 0; i < 5; i++) {
            z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + q + t * 0.05;
        }
        val = length(z) * 0.1;
        val = sin(val * PI) * 0.5 + 0.5;
    } else if (type == 27) { // Plasma radial
        val = sin(length(q) * 10.0 + t) + sin(atan(q.y, q.x) * 5.0 + t * 0.7);
        val = val * 0.25 + 0.5;
    } else if (type == 28) { // Interference
        float d1 = length(q - vec2(0.3, 0.0));
        float d2 = length(q + vec2(0.3, 0.0));
        val = sin(d1 * 15.0 - t * 2.0) + sin(d2 * 15.0 - t * 2.0);
        val = val * 0.25 + 0.5;
    } else { // 29: Cosmos
        float stars = pow(fbmWater(q * 5.0, t * 0.1), 3.0);
        float nebula = fbmWater(q * 1.5, t * 0.2);
        val = stars * 0.5 + nebula * 0.5;
    }

    // Bords aquarelle naturels (jamais de lignes dures)
    val = smoothstep(0.0, 1.0, val);

    // Réaction audio fluide
    val += b * 0.2 * sin(t * 1.5 + length(p) * 3.0 + fbmWater(p * 2.0, t) * 2.0);
    val += tr * 0.1 * fbmWater(p * 8.0 + t * 0.5, t);

    // Palette de couleurs aquarelle (tons doux et translucides)
    vec3 c1 = vec3(0.5 + hash(fid) * 0.3, 0.4 + hash(fid + 0.1) * 0.3, 0.6 + hash(fid + 0.2) * 0.3);
    vec3 c2 = vec3(0.4 + hash(fid + 0.3) * 0.4, 0.5 + hash(fid + 0.4) * 0.3, 0.4 + hash(fid + 0.5) * 0.4);
    vec3 c3 = vec3(1.0, 0.8, 0.6);
    vec3 c4 = vec3(0.0, 0.25, 0.5);

    if (hash(fid * 5.5) > 0.5) c4 = vec3(0.3, 0.1, 0.4);
    if (hash(fid * 6.6) > 0.5) c3 = vec3(0.8, 1.0, 0.7);

    vec3 col = pal(val + t * 0.05 + radius * 0.3, c1, c2, c3, c4);

    // Effet translucide aquarelle
    col = mix(col, col * col, 0.3);

    // Vignette sectorielle très douce
    col *= smoothstep(segmentAngle * 0.9, 0.0, a);

    // Luminosité globale
    col *= 0.85;

    return col;
}

// Rendu avec effet de couches translucides
vec3 renderLayeredEffect(vec2 uv, float t, int id, float b, float tr, float globalZoom) {
    vec3 finalCol = vec3(0.0);

    float fid = float(id);
    float layers = 5.0 + floor(hash(fid) * 3.0);
    float depthSpeed = 0.3 + hash(fid * 2.0) * 0.3;

    for (float i = 0.0; i < 8.0; i++) {
        if (i >= layers) break;

        float audioZoom = t * depthSpeed * uSpeed + b * 0.15 * uSpeed;
        float depth = mod(audioZoom + i / layers + globalZoom, 1.0);
        float z = 1.0 / max(0.01, depth);

        // Fade plus doux pour effet aquarelle
        float fade = smoothstep(0.02, 0.25, depth) * smoothstep(1.0, 0.35, depth);
        fade = pow(fade, 0.8); // Plus de transparence

        vec2 p = uv * z * 0.4;

        // Rotation organique lente
        float audioRot = t * 0.3 + b * 0.3;
        p *= rot(audioRot * (hash(fid + i) - 0.5) * 0.3);

        vec3 col = getPattern(p, t + i * 100.0, id, b, tr);

        // Réaction audio subtile
        col *= (1.0 + b * 0.15);

        // Mélange translucide
        finalCol += col * fade * (1.0 / (1.0 + z * 0.3));
    }

    // Glow central très subtil
    float glow = 0.015 / (length(uv) + 0.1);
    finalCol += vec3(hash(fid*4.0), hash(fid*4.1), hash(fid*4.2)) * glow * (0.3 + b * 0.3);

    return finalCol;
}

void main() {
    vec2 uv = (gl_FragCoord.xy * 2.0 - iResolution.xy) / iResolution.y;
    float t = iTime;

    float duration = 15.0; // 15 secondes par style
    float transition = 2.0; // 2 secondes de transition
    float totalStyles = 30.0; // 30 styles différents

    float globalTime = t;
    float cycle = duration + transition;

    float timeInCycle = mod(globalTime, cycle);
    int currentIdx = int(mod(floor(globalTime / cycle), totalStyles));
    int nextIdx = int(mod(float(currentIdx) + 1.0, totalStyles));

    vec3 col = vec3(0.0);

    if (timeInCycle < duration) {
        col = renderLayeredEffect(uv, t, currentIdx, uBass * uSensitivity, uTreble * uSensitivity, 0.0);
    } else {
        float transT = (timeInCycle - duration) / transition;
        transT = smoothstep(0.0, 1.0, transT);
        transT = transT * transT * (3.0 - 2.0 * transT); // Smoothstep supplémentaire

        float zoom1 = transT * 1.5;
        vec3 c1 = renderLayeredEffect(uv, t, currentIdx, uBass * uSensitivity, uTreble * uSensitivity, zoom1);

        float zoom2 = (transT - 1.0) * 1.5;
        vec2 uv2 = uv * rot(transT * PI * 0.3);
        vec3 c2 = renderLayeredEffect(uv2, t, nextIdx, uBass * uSensitivity, uTreble * uSensitivity, zoom2);

        float alpha = smoothstep(0.15, 0.85, transT);
        col = mix(c1, c2, alpha);

        // Flash très subtil
        float flash = sin(transT * PI);
        flash = pow(flash, 12.0) * 0.1;
        col += pal(t * 0.05, vec3(0.5), vec3(0.3), vec3(1.0), vec3(0.1, 0.2, 0.4)) * flash;
    }

    // Vignette douce
    float maxDist = iResolution.x / iResolution.y * 0.8 + 1.0;
    col *= smoothstep(maxDist, maxDist * 0.3, length(uv));

    // Contraste doux style aquarelle
    col = pow(col, vec3(1.1));
    col *= 1.1;
    col = clamp(col, 0.0, 1.0);

    gl_FragColor = vec4(col, 1.0);
}
`;

const vertexShader = `void main() { gl_Position = vec4(position, 1.0); }`;
