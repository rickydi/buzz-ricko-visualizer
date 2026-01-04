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

float hash(float n) { return fract(sin(n) * 43758.5453); }
float hash21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
mat2 rot(float a) { return mat2(cos(a), -sin(a), sin(a), cos(a)); }

float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash21(i), hash21(i + vec2(1,0)), f.x),
               mix(hash21(i + vec2(0,1)), hash21(i + vec2(1,1)), f.x), f.y);
}

float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.0; a *= 0.5; }
    return v;
}

vec3 pal(float t, float shift) {
    vec3 a = vec3(0.5), b = vec3(0.5);
    vec3 c = vec3(1.0), d = vec3(shift, shift + 0.33, shift + 0.67);
    return a + b * cos(TAU * (c * t + d));
}

void main() {
    vec2 uv = (gl_FragCoord.xy * 2.0 - iResolution.xy) / iResolution.y;
    float t = iTime * uSpeed;
    float bass = uBass * uSensitivity;
    float treble = uTreble * uSensitivity;

    // Style (0-29)
    float cycle = 12.0;
    float styleId = floor(mod(t / cycle, 30.0));
    float h = hash(styleId);
    float colorShift = h;

    // Pattern type (0-9) et groupe (0-2)
    float pType = mod(styleId, 10.0);
    float group = floor(styleId / 10.0);

    // Symétrie basée sur le groupe
    float sym = 3.0 + group * 2.0 + floor(h * 3.0);
    float angle = atan(uv.y, uv.x);
    float r = length(uv);
    float segAng = TAU / sym;
    float a = abs(mod(angle, segAng) - segAng * 0.5);
    vec2 p = vec2(cos(a), sin(a)) * r;

    // Rotation avec audio
    p *= rot(t * 0.1 * (h - 0.5) + bass * 0.3);

    float val = 0.0;

    if (pType < 1.0) {
        // PLASMA - vagues sinusoïdales
        val = sin(p.x * (6.0 + group * 2.0) + t);
        val += sin(p.y * (5.0 + group * 2.0) + t * 1.1);
        val += sin(r * (8.0 + group * 3.0) - t * 2.0 - bass * 4.0);
        val = val * 0.2 + 0.5;
    }
    else if (pType < 2.0) {
        // TUNNEL - effet de profondeur
        val = 1.0 / (r + 0.1) + angle / PI - t * 0.5;
        val += bass * 0.5;
        val = fract(val * (0.5 + group * 0.3));
    }
    else if (pType < 3.0) {
        // SPIRALE
        float spiral = angle + r * (5.0 + group * 3.0) - t * 2.0 - bass * 3.0;
        val = sin(spiral * (2.0 + group)) * 0.5 + 0.5;
    }
    else if (pType < 4.0) {
        // CELLULES / VORONOI simplifié
        vec2 gp = p * (3.0 + group);
        vec2 fp = fract(gp) - 0.5;
        val = 1.0 - length(fp) * 2.0;
        val += sin(t + hash21(floor(gp)) * TAU) * 0.3;
        val = clamp(val + bass * 0.3, 0.0, 1.0);
    }
    else if (pType < 5.0) {
        // FEU / FUMÉE
        vec2 np = p * (2.0 + group);
        np.y -= t * (1.0 + group * 0.5);
        val = fbm(np + bass) * (1.2 + bass * 0.5);
    }
    else if (pType < 6.0) {
        // ÉTOILES
        vec2 sp = p * (8.0 + group * 3.0);
        vec2 fp = fract(sp) - 0.5;
        float d = length(fp);
        val = 0.02 / (d + 0.01);
        val *= step(0.7, hash21(floor(sp) + floor(t)));
        val = min(val, 1.0) * (1.0 + bass * 0.5);
    }
    else if (pType < 7.0) {
        // ONDULATIONS
        val = sin(p.x * (4.0 + group * 2.0) + fbm(p * 2.0) * 3.0 + t + bass * 2.0);
        val += sin(p.y * (3.0 + group * 2.0) - t * 0.8);
        val = val * 0.25 + 0.5;
    }
    else if (pType < 8.0) {
        // DAMIER
        vec2 gp = p * (4.0 + group * 2.0);
        val = mod(floor(gp.x) + floor(gp.y), 2.0);
        val = mix(val, 1.0 - val, sin(t + r * 3.0 + bass * 2.0) * 0.5 + 0.5);
    }
    else if (pType < 9.0) {
        // MANDALA / cercles
        val = sin(r * (10.0 + group * 5.0) - t * 2.0 - bass * 4.0);
        val += sin(angle * (4.0 + group * 2.0) + t);
        val = val * 0.25 + 0.5;
    }
    else {
        // FRACTAL
        vec2 z = p * (1.5 + group * 0.5);
        float v = 0.0;
        for (int i = 0; i < 5; i++) {
            z = abs(z) / dot(z, z) - vec2(0.7 + sin(t * 0.2) * 0.1, 0.5 + bass * 0.1);
            v += length(z);
        }
        val = v * 0.1;
    }

    // Couleur unique par style
    vec3 col = pal(val + t * 0.02, colorShift);

    // Teinte modifiée par groupe
    if (group < 1.0) col *= vec3(1.0, 0.9, 0.8);
    else if (group < 2.0) col *= vec3(0.8, 1.0, 0.9);
    else col *= vec3(0.9, 0.8, 1.0);

    // Réactivité audio
    col *= 0.7 + bass * 0.5 + treble * 0.2;

    // Vignette
    col *= smoothstep(1.8, 0.3, r);

    // Transition entre styles
    float inCycle = mod(t, cycle);
    if (inCycle > cycle - 2.0) {
        float tr = (inCycle - (cycle - 2.0)) / 2.0;
        col = mix(col, col * 0.5 + pal(t * 0.1, colorShift + 0.5) * 0.5, tr * 0.5);
    }

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

const vertexShader = `void main() { gl_Position = vec4(position, 1.0); }`;
