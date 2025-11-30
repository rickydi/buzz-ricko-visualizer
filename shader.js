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

// Bruit et FBM pour les textures
float noise(vec2 p) { 
    vec2 i = floor(p); 
    vec2 f = fract(p); 
    f = f * f * (3.0 - 2.0 * f); 
    return mix(mix(hash21(i), hash21(i + vec2(1,0)), f.x), 
               mix(hash21(i + vec2(0,1)), hash21(i + vec2(1,1)), f.x), f.y); 
}

float fbm(vec2 p) { 
    float v = 0.0, a = 0.5; 
    for (int i = 0; i < 4; i++) { 
        v += a * noise(p); 
        p *= 2.0; 
        a *= 0.5; 
    } 
    return v; 
}

// Générateur de motifs pour les 100 effets
vec3 getPattern(vec2 uv, float t, int id, float b, float tr) {
    float fid = float(id);
    float h = hash(fid); // Graine unique pour cet effet
    
    // 1. Configuration de la symétrie (Kaléidoscope)
    float segments = floor(3.0 + hash(fid * 12.3) * 8.0); // Entre 3 et 10 segments
    if (mod(fid, 5.0) == 0.0) segments *= 2.0; // Parfois beaucoup plus
    
    float angle = atan(uv.y, uv.x);
    float radius = length(uv);
    
    // Rotation globale
    float rotSpeed = (hash(fid * 2.1) - 0.5) * 0.5 * uSpeed;
    angle += t * rotSpeed;
    
    // Application de la symétrie
    float segmentAngle = TAU / segments;
    float a = mod(angle, segmentAngle);
    a = abs(a - segmentAngle * 0.5);
    
    // Coordonnées transformées
    vec2 p = vec2(cos(a), sin(a)) * radius;
    
    // 2. Définition de la forme et de la texture (STYLE AQUARELLE/LIQUIDE)
    float val = 0.0;
    int type = int(mod(fid, 10.0)); // 10 types de base
    
    // Déformation liquide générale (PLUS INTENSE)
    vec2 q = p;
    float liquid = fbm(p * 3.0 + t * 0.2);
    q += vec2(cos(liquid * 5.0 + t), sin(liquid * 5.0)) * 0.3;
    
    // Distorsion supplémentaire pour effet "huile dans l'eau"
    q += vec2(fbm(q * 2.0 - t * 0.1), fbm(q * 2.0 + t * 0.1)) * 0.5;
    
    // On remplace les formes géométriques dures par des variations fluides
    if (type == 0) { // Vagues douces
        val = fbm(q * 3.0 + t * 0.2);
    } else if (type == 1) { // Gouttes d'encre
        val = length(q) - fbm(q * 5.0 - t);
        val = smoothstep(0.4, 0.6, val);
    } else if (type == 2) { // Marbre liquide
        val = fbm(p * 2.0 + fbm(p * 4.0 + t * 0.1));
    } else if (type == 3) { // Flux d'énergie doux
        val = abs(sin(q.x * 10.0 + t * 0.5 + b)) * 0.5 + 0.5;
    } else if (type == 4) { // Nuages colorés
        val = fbm(q * 4.0) * fbm(q * 2.0 - t * 0.1);
    } else if (type == 5) { // Fleurs d'eau
        float r = length(q);
        float an = atan(q.y, q.x);
        val = sin(r * 10.0 - t + 2.0 * sin(an * 5.0));
    } else if (type == 6) { // Plasma soft
        val = sin(q.x * 5.0 + t) * sin(q.y * 5.0 + t * 0.8);
        val = val * 0.5 + 0.5;
    } else if (type == 7) { // Tourbillon zen
        float an = atan(q.y, q.x) + length(q) * 2.0;
        val = sin(an * 3.0 - t);
    } else if (type == 8) { // Diffusion d'encre
        val = fbm(uv * 3.0 + t * 0.1);
        val = smoothstep(0.2, 0.8, val);
    } else { // Nébuleuse liquide
        val = fbm(q * 2.5 - t * 0.15 + b);
    }
    
    // Contraste plus fort sur les formes liquides
    val = smoothstep(-0.2, 1.2, val);
    val = pow(val, 1.2); // Assombrir les tons moyens
    
    // Réaction audio PLUS DOUCE et FLUIDE sur la forme
    val += b * 0.3 * sin(t * 2.0 + length(p)*5.0); // Ondulation basse fréq
    val += tr * 0.1 * fbm(p * 10.0 + t); // Scintillement hautes fréq
    
    // 3. Colorisation (Palette procédurale)
    vec3 c1 = vec3(hash(fid), hash(fid + 0.1), hash(fid + 0.2));
    vec3 c2 = vec3(hash(fid + 0.3), hash(fid + 0.4), hash(fid + 0.5));
    vec3 c3 = vec3(1.0);
    vec3 c4 = vec3(0.0, 0.33, 0.67); // Phase par défaut
    
    // Variation des palettes
    if (hash(fid * 5.5) > 0.5) c4 = vec3(0.5, 0.2, 0.25);
    if (hash(fid * 6.6) > 0.5) c3 = vec3(2.0, 1.0, 0.0);
    
    vec3 col = pal(val + t * 0.1 + radius, c1, c2, c3, c4);
    
    // Assombrir les bords de la cellule de symétrie (vignettage sectoriel plus DOUX pour éviter les limites dures)
    col *= smoothstep(segmentAngle * 0.8, 0.0, a);
    
    // Assombrir globalement pour le contraste
    col *= 0.8;
    
    return col;
}

// Fonction pour rendre un effet complet (tunnel de couches)
vec3 renderLayeredEffect(vec2 uv, float t, int id, float b, float tr, float globalZoom) {
    vec3 finalCol = vec3(0.0); // Fond NOIR profond par défaut
    float totalDensity = 0.0;
    
    // Paramètres déduits de l'ID
    float fid = float(id);
    float layers = 4.0 + floor(hash(fid) * 4.0); // 4 à 8 couches
    float depthSpeed = 0.5 + hash(fid * 2.0) * 0.5;
    
    for (float i = 0.0; i < 6.0; i++) {
        if (i >= layers) break;

        // Réactivité audio sur la vitesse de profondeur (BOOM sur les basses)
        float audioZoom = t * depthSpeed * uSpeed + b * 0.2 * uSpeed; 
        
        // Profondeur allant de 0 (loin/centre) à 1 (proche/bord)
        // "+ t" assure un mouvement vers l'avant (SORTIE du centre)
        float depth = mod(audioZoom + i / layers + globalZoom, 1.0);
        
        // Z diminue quand on se rapproche (depth augmente) -> l'objet grossit à l'écran
        float z = 1.0 / max(0.01, depth);
        
        // Fade in au centre (0) et Fade out quand ça passe la caméra (1)
        // Fade out plus rapide pour laisser plus de noir
        float fade = smoothstep(0.05, 0.2, depth) * smoothstep(1.0, 0.4, depth);
        
        vec2 p = uv * z * 0.5; 
        
        // Réactivité audio sur la rotation
        float audioRot = t + b * 0.5;
        p *= rot(audioRot * (hash(fid + i) - 0.5) * 0.5); 
        
        vec3 col = getPattern(p, t + i * 100.0, id, b, tr);
        
        // Flash sur les Basses (ATTTENUE)
        col *= (1.0 + b * 0.2);
        
        // Mélange additif plus sélectif pour garder le contraste
        finalCol += col * fade * (1.0 / (1.0 + z * 0.2)); 
    }
    
    // Glow central beaucoup plus subtil
    finalCol += vec3(hash(fid*4.0), hash(fid*4.1), hash(fid*4.2)) * (0.02 / length(uv)) * (0.5 + b * 0.5);
    
    return finalCol;
}

void main() {
    vec2 uv = (gl_FragCoord.xy * 2.0 - iResolution.xy) / iResolution.y;
    float t = iTime;
    
    // Gestion des indices d'effets pour la transition
    float duration = 10.0; // Durée par effet
    float transition = 3.0; // Durée de transition
    
    float globalTime = t;
    float cycle = duration + transition;
    
    float timeInCycle = mod(globalTime, cycle);
    int currentIdx = int(floor(globalTime / cycle));
    int nextIdx = currentIdx + 1;
    
    // Limiter aux 100 effets
    int id1 = currentIdx - (currentIdx / 100) * 100;
    int id2 = nextIdx - (nextIdx / 100) * 100;
    
    vec3 col = vec3(0.0);
    
    if (timeInCycle < duration) {
        // Effet stable
        // On passe un "zoom" qui avance doucement pour que ce soit vivant
        col = renderLayeredEffect(uv, t, id1, uBass * uSensitivity, uTreble * uSensitivity, 0.0);
    } else {
        // Transition
        float transT = (timeInCycle - duration) / transition; // 0.0 à 1.0
        transT = smoothstep(0.0, 1.0, transT);
        
        // Effet de zoom accéléré vers le centre (trou noir)
        // L'image actuelle zoome vers l'intérieur (disparait au centre) ou l'extérieur
        
        // Transition : Accélération vers l'avant (WARPSPEED)
        
        // L'effet actuel accélère vers nous (avance dans le temps/profondeur)
        float zoom1 = transT * 2.0; 
        vec3 c1 = renderLayeredEffect(uv, t, id1, uBass * uSensitivity, uTreble * uSensitivity, zoom1);
        
        // Le nouvel effet arrive du loin (centre)
        // On le décale négativement pour qu'il semble venir de très loin
        float zoom2 = (transT - 1.0) * 2.0; 
        
        // Rotation pendant la transition
        vec2 uv2 = uv * rot(transT * PI * 0.5);
        vec3 c2 = renderLayeredEffect(uv2, t, id2, uBass * uSensitivity, uTreble * uSensitivity, zoom2);
        
        // Fondu non-linéaire pour une sensation d'immersion
        float alpha = smoothstep(0.2, 0.8, transT);
        col = mix(c1, c2, alpha);
        
        // Flash atténué et coloré (moins agressif pour les yeux)
        float flash = sin(transT * PI);
        flash = pow(flash, 10.0) * 0.2; // Moins intense
        col += pal(t * 0.1, vec3(0.5), vec3(0.5), vec3(1.0), vec3(0.0, 0.3, 0.6)) * flash;
    }
    
    // Vignette adaptée aux écrans ultra-larges (45" curved)
    // On repousse le noir très loin pour ne pas couper les bords sur du 32:9
    float maxDist = iResolution.x / iResolution.y * 0.8 + 1.0;
    col *= smoothstep(maxDist, maxDist * 0.4, length(uv));
    
    // Augmentation du contraste global
    col = pow(col, vec3(1.3)); // Gamma plus élevé = plus sombre/contrasté
    col *= 1.2; // Compenser un peu l'assombrissement
    col = clamp(col, 0.0, 1.0);

    gl_FragColor = vec4(col, 1.0);
}
`;

const vertexShader = `void main() { gl_Position = vec4(position, 1.0); }`;
