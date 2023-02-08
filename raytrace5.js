
rooms.raytrace5 = function() {

lib3D();

description = `Raytrace to quadrics<br>in a fragment shader
<small>
    <p>  <input type=range id=red   value= 5> bg red
    <br> <input type=range id=green value=10> bg green
    <br> <input type=range id=blue  value=50> bg blue
    <br> <input type=range id=refract value=50> refract
         <div id=iorInfo>&nbsp;</div>
</small>
`;

code = {
'init':`

   // DEFINE MATERIALS TO BE RENDERED VIA PHONG REFLECTANCE MODEL

   S.redPlastic    = [.2,.1,.1,0,  .5,.2,.2,0,  2,2,2,20,  0,0,0,0];
   S.greenPlastic  = [.1,.2,.1,0,  .2,.5,.2,0,  2,2,2,20,  0,0,0,0];
   S.bluePlastic   = [.1,.1,.2,0,  .2,.2,.5,0,  2,2,2,20,  0,0,0,0];
   S.whitePlastic  = [.2,.2,.2,0,  .5,.5,.5,0,  2,2,2,20,  0,0,0,0];
`,

fragment: `
S.setFragmentShader(\`

   // DECLARE CONSTANTS, UNIFORMS, VARYING VARIABLES

   const int nQ = \` + S.nQ + \`;
   const int nL = \` + S.nL + \`;
   uniform vec3 uBgColor;
   uniform vec3 uLd[nL];
   uniform vec3 uLc[nL];
   uniform mat4 uQ[nQ];
   uniform mat4 uPhong[nQ];
   uniform int  uShape[nQ];
   uniform float uIor;

   float fl = 2.;
   varying vec3 vPos;


   vec3 normalQ(vec3 P, mat4 Q){
      float fx = (2. * Q[0][0] * P[0]) + ((Q[1][0] + Q[0][1]) * P[1]) + ((Q[2][0] + Q[0][2]) * P[2]) + (Q[3][0] + Q[0][3]);
      float fy = ((Q[1][0] + Q[0][1]) * P[0]) + (2. * Q[1][1] * P[1]) + ((Q[2][1] + Q[1][2]) * P[2]) + (Q[3][1] + Q[1][3]);
      float fz = ((Q[2][0] + Q[0][2]) * P[0]) + ((Q[2][1] + Q[1][2]) * P[1]) + (2. * Q[2][2] * P[2]) + (Q[3][2] + Q[2][3]);
      vec3 B = vec3(fx, fy, fz);
      return normalize(B);
   }

   vec3 quadratic(float a, float b, float c){
      
      float check = b*b - 4.*a*c;
      
      if(check < 0.){
         return vec3(0.,0.,0.);
      }
      
     
         float RA = (-b + sqrt(check))/(2.*a);
         float RB = (-b - sqrt(check))/(2.*a);
         return vec3(RA,RB,1.);
     
   }

   float MO(vec4 a, mat4 Q, vec4 b){

     vec4 temp = a * Q;
     
      return temp.x*b.r + temp.y*b.g + temp.z*b.b + temp.w*b.a;
   }

   vec2 rayQ(vec3 V, vec3 W, mat4 Q){
      vec4 V1 = vec4(V, 1.);
      vec4 W0 = vec4(W, 0.);
      float a = dot(W0, Q*W0);
      float b = dot(V1, Q*W0) + dot(W0, Q*V1);
      float c = dot(V1, Q*V1);
      float d = sqrt(b*b - (4. * a * c));
      float r1 = d < 0. ? -1. : (-b - d) / (2. * a);
      float r2 = d < 0. ? -1. : (-b + d) / (2. * a);
      vec2 roots = vec2(r1, r2); 
      return roots; 
   }


   vec3 Q1(vec3 T, int n, vec2 t){

      float tIn  = t.x;
      float tOut = t.y;
      if(tIn > 0. && tIn < tOut && tIn < T.y){
         T = vec3(n,tIn,tOut);
      }
      return T;
   }

   
   vec3 Q2(vec3 T, int n, vec2 t0, vec2 t1){

      float tIn  = max(t0.x,t1.x);
      float tOut = min(t0.y,t1.y);
      if(tIn > 0. && tIn < tOut && tIn < T.y){
         int i = (t0.x == tIn)? 0 : 1;
         T = vec3(n+i,tIn,tOut);
      }
      return T;
   }

   vec3 Q3(vec3 T, int n, vec2 t0, vec2 t1, vec2 t2){

      float tIn  = max(max(t0.x,t1.x),t2.x);
      float tOut = min(min(t0.y,t1.y),t2.y);
      if(tIn > 0. && tIn < tOut && tIn < T.y){
         int i;
         if(t0.x == tIn){
            i = 0;
         }
         else if(t1.x == tIn){
            i = 1;
         }
         else if(t2.x == tIn){
            i = 2;
         }
         T = vec3(n+i,tIn,tOut);
      }
      return T;
   }

   vec3 Q4(vec3 T, int n, vec2 t0, vec2 t1, vec2 t2, vec2 t3){

      float tIn  = max(max(max(t0.x,t1.x),t2.x),t3.x);
      float tOut = min(min(min(t0.y,t1.y),t2.y),t3.y);
      if(tIn > 0. && tIn < tOut && tIn < T.y){
         int i;
         if(t0.x == tIn){
            i = 0;
         }
         else if(t1.x == tIn){
            i = 1;
         }
         else if(t2.x == tIn){
            i = 2;
         }
         else if(t3.x == tIn){
            i = 3;
         }
         T = vec3(n+i,tIn,tOut);
      }
      return T;
   }
   

   vec3 rayScene(vec3 V, vec3 W){
      vec3 T = vec3(-1,1000.,0.);
      for (int n = 0 ; n < nQ ; n++){
         if(uShape[n] == 1){

            vec2 tRay = rayQ(V,W,uQ[n]);
            T = Q1(T,n,tRay);
         }
         else if(uShape[n] == 2){
            vec2 tRay1 = rayQ(V,W,uQ[n]);
            vec2 tRay2 = rayQ(V,W,uQ[n+1]);
            T = Q2(T,n,tRay1,tRay2);
         }
         else if(uShape[n] == 3){
            vec2 tRay1 = rayQ(V,W,uQ[n]);
            vec2 tRay2 = rayQ(V,W,uQ[n+1]);
            vec2 tRay3 = rayQ(V,W,uQ[n+2]);
            T = Q3(T,n,tRay1,tRay2,tRay3);
         }
         else if(uShape[n] == 4){
            vec2 tRay1 = rayQ(V,W,uQ[n]);
            vec2 tRay2 = rayQ(V,W,uQ[n+1]);
            vec2 tRay3 = rayQ(V,W,uQ[n+2]);
            vec2 tRay4 = rayQ(V,W,uQ[n+3]);
            T = Q4(T,n,tRay1,tRay2,tRay3,tRay4);
         }
      }
      return T;
   }
      

   vec3 shadeSurface(vec3 P, vec3 N, mat4 phong){
      
      vec3  ambient  = phong[0].rgb;
      vec3  diffuse  = phong[1].rgb;
      vec3  specular = phong[2].rgb;
      float p        = phong[2].a;

      vec3 c = mix(ambient, uBgColor, .3);
      vec3 E = vec3(0.,0.,1.);
      for (int l = 0 ; l < nL ; l++) {

         vec3 R = 2. * dot(N, uLd[l]) * N - uLd[l];
         c += uLc[l] * (diffuse * max(0.,dot(N, uLd[l]))
               + specular * pow(max(0., dot(R, E)), p));
         
      }

      return c;
   }


   vec3 refractRay(vec3 W, vec3 N, float n){
      vec3 C1 = N*(dot(W,N));
      vec3 S1 = W - C1;
      float SinInAngle = asin(length(S1));
      float SinOutAngle = asin(sin(SinInAngle) * n);
      vec3 C2 = C1 * cos(SinOutAngle)/cos(SinInAngle);
      vec3 S2 = S1 * sin(SinOutAngle)/sin(SinInAngle);
      vec3 W2 = C2+S2;
      return W2;
   }




   void main() {
      vec3 color = uBgColor;
      vec3 V = vec3(0.,0.,fl);
      vec3 W = normalize(vec3(vPos.xy, -fl));

      vec3 T = rayScene(V,W);
      int n = int(T.x);

      if(n >= 0){
         vec3 P = V + T.y * W;
         n = int(T.x);
         mat4 Q;
         mat4 material;
         for (int i = 0 ; i < nQ ; i++){
            if (i == int(T.x)) {
               Q = uQ[i];    
               material = uPhong[i];
            }
         }
         vec3 normal = normalQ(P, Q);

         color = shadeSurface(P,normal,material);




         //do reflection
         
         vec3 R = 2. * dot(normal, -W) * normal + W;
         
         vec3 TReflect = rayScene(P, R);
         int nReflect = int(TReflect.x);
         if(nReflect >= 0){
            
            vec3 PRef = P + TReflect.y * R;
            mat4 QReflect;
            mat4 materialReflect;
            for (int i = 0 ; i < nQ ; i++){
               if (i == int(TReflect.x)) {
               QReflect = uQ[i];    
               materialReflect = uPhong[i];
               }
            }
            vec3 RefNormal = normalQ(PRef, QReflect);

            color += shadeSurface(PRef, RefNormal, materialReflect);
            
         }
         
         //do refraction
         vec3 refractW = refractRay(W, normal, 1./uIor);
         vec3 TRefract = rayScene( P +.01*refractW ,refractW);
         int nRefract = int(TRefract.x);
         if(nRefract >= 0){
            
            vec3 PRefract = P + TRefract.y * refractW;
            mat4 QRefract;
            mat4 materialRefract;
            for (int i = 0 ; i < nQ ; i++){
               if (i == int(TRefract.x)) {
               QRefract = uQ[i];    
               materialRefract = uPhong[i];
               }
            }
            vec3 RefractNormal = normalQ(PRefract, QRefract);
            color += material[1].rgb * shadeSurface(PRefract, RefractNormal, materialRefract) * .8;
            
            //color = vec3(0.,0.,0.);
            //color += shadeSurface(PRef, RefNormal, materialReflect);
         }
         

         
      }
      gl_FragColor = vec4(sqrt(color), 1.);
   }
\`);
`,
vertex: `
S.setVertexShader(\`

   attribute vec3 aPos;
   varying   vec3 vPos;

   void main() {
      vPos = aPos;
      gl_Position = vec4(aPos, 1.);
   }

\`)

`,
render: `

   // USEFUL VECTOR FUNCTIONS

   let add = (a,b) => [ a[0]+b[0], a[1]+b[1], a[2]+b[2] ];
   let dot = (a,b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
   let norm = v => Math.sqrt(dot(v,v));
   let normalize = v => { let s = norm(v); return [ v[0]/s, v[1]/s, v[2]/s ]; }
   let scale = (v,s) => [ s * v[0], s * v[1], s * v[2] ];
   let subtract = (a,b) => [ a[0]-b[0], a[1]-b[1], a[2]-b[2] ];

   // SEND LIGHT SOURCE DATA TO GPU

   let ldData = [ normalize([1,1,1]),
                  normalize([-1,-1,-1]) ];
   S.setUniform('3fv', 'uLd', ldData.flat());
   S.setUniform('3fv', 'uLc', [ 1,1,1, .5,.3,.1 ]);

   // DEFINE NUMBER OF LIGHTS FOR GPU

   S.nL = ldData.length;

   // SEND BACKGROUND COLOR TO GPU

   S.setUniform('3fv', 'uBgColor', [ red.value   / 100,
                                     green.value / 100,
                                     blue.value  / 100 ]);

   // SEND INDEX OF REFRACTION TO GPU

   let ior = refract.value / 100 + 1;
   S.setUniform('1f', 'uIor', ior);

   // DIFFERENT QUADRIC SURFACES

//                xx        yy         zz           c

   let qSlabX  = [1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,-1]; // x*x - 1 <= 0
   let qSlabY  = [0,0,0,0, 0,1,0,0, 0,0,0,0, 0,0,0,-1]; // y*y - 1 <= 0
   let qSlabZ  = [0,0,0,0, 0,0,0,0, 0,0,1,0, 0,0,0,-1]; // z*z - 1 <= 0
   let qSphere = [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,-1]; // x*x + y*y + z*z - 1 <= 0
   let qTubeX  = [0,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,-1]; // y*y + z*z - 1 <= 0
   let qTubeY  = [1,0,0,0, 0,0,0,0, 0,0,1,0, 0,0,0,-1]; // x*x + z*z - 1 <= 0
   let qTubeZ  = [1,0,0,0, 0,1,0,0, 0,0,0,0, 0,0,0,-1]; // x*x + y*y - 1 <= 0

   // SHAPES ARE INTERSECTIONS OF QUADRIC SURFACES

   let shape = [], coefs = [], xform = [], phong = [], M;

   let sphere = (m, M) => {
      shape.push(1);
      phong.push(m);
      xform.push(M);
      coefs.push(qSphere);
   }

   let sphere1 = (m, M) => {
      shape.push(1);
      phong.push(m);
      xform.push(M);
      coefs.push(qSphere);
   }

   let sphere2 = (m, M) => {
      shape.push(1);
      phong.push(m);
      xform.push(M);
      coefs.push(qSphere);
   }
   let sphere3 = (m, M) => {
      shape.push(1);
      phong.push(m);
      xform.push(M);
      coefs.push(qSphere);
   }
   let sphere4 = (m, M) => {
      shape.push(1);
      phong.push(m);
      xform.push(M);
      coefs.push(qSphere);
   }


   let tubeX = (m, M) => {
      shape.push(2, 0);
      phong.push(m, m);
      xform.push(M, M);
      coefs.push(qTubeX, qSlabX);
   }

   let tubeY = (m, M) => {
      shape.push(2, 0);
      phong.push(m, m);
      xform.push(M, M);
      coefs.push(qTubeY, qSlabY);
   }

   let tubeZ = (m, M) => {
      shape.push(2, 0);
      phong.push(m, m);
      xform.push(M, M);
      coefs.push(qTubeZ, qSlabZ);
   }

   let cube = (m, M) => {
      shape.push(3, 0, 0);
      phong.push(m, m, m);
      xform.push(M, M, M);
      coefs.push(qSlabX, qSlabY, qSlabZ);
   }

   let octahedron = (m, M) => {
      shape.push(4, 0, 0, 0);
      phong.push(m, m, m, m);
      xform.push(M, M, M, M);
      coefs.push([1, 2, 2, 0,  0, 1, 2, 0,  0,0,1,0,  0,0,0,-1]);
      coefs.push([1,-2,-2, 0,  0, 1, 2, 0,  0,0,1,0,  0,0,0,-1]);
      coefs.push([1,-2, 2, 0,  0, 1,-2, 0,  0,0,1,0,  0,0,0,-1]);
      coefs.push([1, 2,-2, 0,  0, 1,-2, 0,  0,0,1,0,  0,0,0,-1]);
   }

   // CREATE THE SCENE


   octahedron(S.greenPlastic,
      mScale(.2,.2,.2,
      mRoty(time * 1.2,
      mRotz(time * 1.3,
      mRotx(time * 1.1,
      matrixTranslate(Math.sin(time)*.5,0,-Math.cos(time)*.5+.5))))));



   sphere(S.bluePlastic,
          mScale(.15,.15,.15,
          mRoty(time * 1.3,
          mRotz(time * 1.1,
          mRotx(time * 1.2,
          matrixTranslate(Math.sin(time)*.5,0,-Math.cos(time)*.5+.5))))));

   sphere1(S.redPlastic,
            mScale(.05,.05,.05,
            mRoty(time * 1.3,
            mRotz(time * 1.1,
            mRotx(time * 1.2,
            matrixTranslate(Math.sin(time)*.5,-Math.cos(time)*.4,Math.sin(time)*.4+.5))))))

   sphere2(S.greenPlastic,
            mScale(.05,.05,.05,
            mRoty(time * 1.3,
            mRotz(time * 1.1,
            mRotx(time * 1.2,
            matrixTranslate(Math.cos(time)*.25,Math.sin(time)*.5,Math.sin(time)*.5+.5))))))
   sphere3(S.greenPlastic,
            mScale(.05,.05,.05,
            mRoty(time * 1.3,
            mRotz(time * 1.1,
            mRotx(time * 1.2,
            matrixTranslate(Math.sin(time)*.5,Math.cos(time)*.3+0.5,Math.sin(time)*.1+.5))))))
   sphere4(S.redPlastic,
            mScale(.05,.05,.05,
            mRoty(time * 1.4,
            mRotz(time * 1.2,
            mRotx(time * 1.3,
            matrixTranslate(Math.cos(time)*.4+0.2,Math.sin(time)*.5,Math.sin(time)*.1+.5))))))



   // SEND SCENE DATA TO GPU

   for (let n = 0 ; n < coefs.length ; n++) {
      let IM = matrixInverse(xform[n]);
      coefs[n] = matrixMultiply(matrixTranspose(IM), matrixMultiply(coefs[n], IM));
   }
   S.setUniform('1iv', 'uShape', shape);
   S.setUniform('Matrix4fv', 'uQ', false, coefs.flat());
   S.setUniform('Matrix4fv', 'uPhong', false, phong.flat());

   // DEFINE NUMBER OF QUADRIC SURFACES FOR GPU

   S.nQ = coefs.length;

   // RENDER THIS ANIMATION FRAME

   S.gl.drawArrays(S.gl.TRIANGLE_STRIP, 0, 4);

   // SET ANY HTML INFO

   iorInfo.innerHTML = 'index of refraction = ' + (ior * 100 >> 0) / 100;
`,
events: `
   ;
`
};

}


