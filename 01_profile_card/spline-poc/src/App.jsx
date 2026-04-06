import Spline from '@splinetool/react-spline';

function App() {
  function applyTexture(splineApp, objectName, imageSrc) {
    const obj = splineApp.findObjectByName(objectName);
    if (!obj) {
      console.warn(`${objectName}: 못 찾음`);
      return;
    }

    const texLayer = [...Array(obj.material.layers.length)]
      .map((_, i) => obj.material.layers[i])
      .find((l) => l.type === 'texture');

    if (!texLayer) {
      console.warn(`${objectName}: texture 레이어 없음`);
      return;
    }

    console.log(`${objectName}: texture 레이어 발견, 이미지 로드 시작`);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageSrc;
    img.onload = () => {
      // A: updateTexture (Image)
      texLayer.updateTexture(img);

      // B: updateTexture (data URL)
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext('2d').drawImage(img, 0, 0);
      texLayer.updateTexture(canvas.toDataURL('image/png'));

      // C: texture.image 직접 교체
      const tex = texLayer.texture;
      tex.image = img;
      texLayer.texture = tex;

      console.log(`${objectName}: 텍스처 적용 완료`);
    };
  }

  function onLoad(splineApp) {
    console.log('onLoad 호출됨');

    // Group 오브젝트 스케일 70%로 축소
    const group = splineApp.findObjectByName('Group');
    if (group) {
      group.scale.x = 0.7;
      group.scale.y = 0.7;
      group.scale.z = 0.7;
      console.log('Group 스케일 0.7 적용');
    }

    applyTexture(splineApp, 'profileImage', '/man.png');
    applyTexture(splineApp, 'profileImage-2', '/man.png');
  }

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Spline
        scene="https://prod.spline.design/lUTrZH2tVSyiKzPA/scene.splinecode"
        onLoad={onLoad}
      />
    </div>
  );
}

export default App;
