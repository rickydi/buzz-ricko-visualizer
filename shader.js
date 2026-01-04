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
    f = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
    return mix(mix(hash21(i), hash21(i + vec2(1,0)), f.x),
               mix(hash21(i + vec2(0,1)), hash21(i + vec2(1,1)), f.x), f.y);
}

// FBM aquarelle
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

// Voronoi
float voronoi(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float minDist = 1.0;
    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 neighbor = vec2(float(x), float(y));
            float h = hash21(i + neighbor);
            vec2 point = vec2(h, fract(h * 13.7)) * 0.5 + 0.25;
            float d = length(neighbor + point - f);
            minDist = min(minDist, d);
        }
    }
    return minDist;
}

// Générateur de motifs - 30 variations via formules mathématiques
vec3 getPattern(vec2 uv, float t, int id, float b, float tr) {
    float fid = float(id);
    float h = hash(fid);

    // Paramètres basés sur l'ID pour créer 30 variations uniques
    float segments = floor(3.0 + hash(fid * 12.3) * 5.0);
    float angle = atan(uv.y, uv.x);
    float radius = length(uv);

    float rotSpeed = (hash(fid * 2.1) - 0.5) * 0.2 * uSpeed;
    angle += t * rotSpeed;

    float segmentAngle = TAU / segments;
    float a = mod(angle, segmentAngle);
    a = abs(a - segmentAngle * 0.5);

    vec2 p = vec2(cos(a), sin(a)) * radius;

    // Déformation liquide
    vec2 q = p;
    float flow1 = fbmWater(p * 2.0 + t * 0.1, t);
    float flow2 = fbmWater(p * 1.5 - t * 0.08, t);
    q += vec2(flow1, flow2) * 0.6;
    q += vec2(sin(flow1 * TAU + t * 0.2), cos(flow2 * TAU - t * 0.15)) * 0.3;

    // Paramètres de variation basés sur l'ID
    float freq1 = 2.0 + hash(fid * 3.3) * 6.0;
    float freq2 = 1.5 + hash(fid * 4.4) * 4.0;
    float speed1 = (hash(fid * 5.5) - 0.5) * 0.6;
    float speed2 = (hash(fid * 6.6) - 0.5) * 0.4;
    float mixAmt = hash(fid * 7.7);
    float waveType = hash(fid * 8.8);
    float spiralAmt = hash(fid * 9.9) * 3.0;

    // Base patterns combinés mathématiquement
    float fbm1 = fbmWater(q * freq1, t * 0.2);
    float fbm2 = fbmWater(q * freq2 + 50.0, t * 0.15);
    float vor = voronoi(q * (2.0 + hash(fid * 10.1) * 3.0) + t * speed1);

    float an = atan(q.y, q.x);
    float r = length(q);

    // Combinaisons pour créer 30 visuels uniques
    float wave = sin(q.x * freq1 + fbm1 * 3.0 + t * speed1);
    float wave2 = sin(q.y * freq2 + fbm2 * 2.0 + t * speed2);
    float spiral = sin(an * (2.0 + floor(hash(fid * 11.1) * 5.0)) + r * spiralAmt - t * 0.3);
    float rings = sin(r * freq1 * 2.0 - t * 0.5 + fbm1 * 2.0);
    float marble = sin(fbm1 * PI * 3.0 + fbmWater(p * 3.0, t) * 2.0);

    // Mix basé sur l'ID pour créer des variations
    float val = 0.0;
    val += fbm1 * (0.3 + mixAmt * 0.4);
    val += (1.0 - vor) * (0.2 + (1.0 - mixAmt) * 0.3);
    val += wave * 0.15 * waveType;
    val += wave2 * 0.15 * (1.0 - waveType);
    val += spiral * 0.2 * hash(fid * 12.2);
    val += rings * 0.15 * hash(fid * 13.3);
    val += marble * 0.2 * hash(fid * 14.4);

    val = val * 0.5 + 0.5;
    val = smoothstep(0.1, 0.9, val);

    // Réaction audio
    val += b * 0.2 * sin(t * 1.5 + length(p) * 3.0 + fbm1 * 2.0);
    val += tr * 0.1 * fbm2;

    // Palette de couleurs unique par style
    vec3 c1 = vec3(0.5 + hash(fid) * 0.3, 0.4 + hash(fid + 0.1) * 0.3, 0.6 + hash(fid + 0.2) * 0.3);
    vec3 c2 = vec3(0.4 + hash(fid + 0.3) * 0.4, 0.5 + hash(fid + 0.4) * 0.3, 0.4 + hash(fid + 0.5) * 0.4);
    vec3 c3 = vec3(0.9 + hash(fid * 15.5) * 0.1, 0.7 + hash(fid * 16.6) * 0.2, 0.5 + hash(fid * 17.7) * 0.3);
    vec3 c4 = vec3(hash(fid * 18.8) * 0.3, 0.2 + hash(fid * 19.9) * 0.2, 0.4 + hash(fid * 20.0) * 0.3);

    vec3 col = pal(val + t * 0.05 + radius * 0.3, c1, c2, c3, c4);
    col = mix(col, col * col, 0.3);
    col *= smoothstep(segmentAngle * 0.9, 0.0, a);
    col *= 0.85;

    return col;
}

// Rendu avec couches
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

        float fade = smoothstep(0.02, 0.25, depth) * smoothstep(1.0, 0.35, depth);
        fade = pow(fade, 0.8);

        vec2 p = uv * z * 0.4;
        float audioRot = t * 0.3 + b * 0.3;
        p *= rot(audioRot * (hash(fid + i) - 0.5) * 0.3);

        vec3 col = getPattern(p, t + i * 100.0, id, b, tr);
        col *= (1.0 + b * 0.15);
        finalCol += col * fade * (1.0 / (1.0 + z * 0.3));
    }

    float glow = 0.015 / (length(uv) + 0.1);
    finalCol += vec3(hash(fid*4.0), hash(fid*4.1), hash(fid*4.2)) * glow * (0.3 + b * 0.3);

    return finalCol;
}

void main() {
    vec2 uv = (gl_FragCoord.xy * 2.0 - iResolution.xy) / iResolution.y;
    float t = iTime;

    float duration = 15.0;
    float transition = 2.0;
    float totalStyles = 30.0;

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
        transT = transT * transT * (3.0 - 2.0 * transT);

        float zoom1 = transT * 1.5;
        vec3 c1 = renderLayeredEffect(uv, t, currentIdx, uBass * uSensitivity, uTreble * uSensitivity, zoom1);

        float zoom2 = (transT - 1.0) * 1.5;
        vec2 uv2 = uv * rot(transT * PI * 0.3);
        vec3 c2 = renderLayeredEffect(uv2, t, nextIdx, uBass * uSensitivity, uTreble * uSensitivity, zoom2);

        float alpha = smoothstep(0.15, 0.85, transT);
        col = mix(c1, c2, alpha);

        float flash = sin(transT * PI);
        flash = pow(flash, 12.0) * 0.1;
        col += pal(t * 0.05, vec3(0.5), vec3(0.3), vec3(1.0), vec3(0.1, 0.2, 0.4)) * flash;
    }

    float maxDist = iResolution.x / iResolution.y * 0.8 + 1.0;
    col *= smoothstep(maxDist, maxDist * 0.3, length(uv));

    col = pow(col, vec3(1.1));
    col *= 1.1;
    col = clamp(col, 0.0, 1.0);

    gl_FragColor = vec4(col, 1.0);
}
`;

const vertexShader = `void main() { gl_Position = vec4(position, 1.0); }`;
