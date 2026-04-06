# Spline 3D 오브젝트 텍스처 런타임 교체 PoC

## 목적

스플라인(Spline)으로 만든 3D 씬을 React에서 렌더링할 때, 특정 오브젝트의 텍스처를 외부 이미지 URL로 런타임에 교체할 수 있는지 검증한다.

## 배경

- 스플라인 에디터 내에서는 변수(Variables)를 통한 이미지 URL 바인딩을 지원하지 않음
- 이미지가 3D 오브젝트와 함께 회전해야 하므로 CSS 오버레이 방식은 불가
- Three.js 기반인 스플라인 런타임의 내부 구조를 활용하여 텍스처를 교체하는 방식으로 접근

## 범위

- **In scope**: 하드코딩된 이미지 URL 하나를 체커보드 오브젝트의 텍스처로 교체하는 PoC
- **Out of scope**: DB 연동, 다수 유저 프로필, 프로덕션 에러 핸들링

## 대상 오브젝트

스플라인 씬 내 체커보드(투명) 패턴이 보이는 사각형 오브젝트

## 기술 스택

- React (Vite)
- `@splinetool/react-spline`
- `three` (TextureLoader)

## 아키텍처

```
React App (Vite)
  └─ SplineScene 컴포넌트
       ├─ @splinetool/react-spline → 씬 URL로 3D 씬 렌더링
       ├─ onLoad 콜백 → spline.findObjectByName("오브젝트명")
       └─ Three.js TextureLoader → 외부 이미지 URL 로드 → material.map 교체
```

## 구현 흐름

1. **스플라인 준비**
   - 체커보드 오브젝트에 식별 가능한 이름 지정 (예: `ProfileImage`)
   - 씬을 Export → URL 획득

2. **React 프로젝트 셋업**
   - Vite + React 프로젝트 생성
   - `@splinetool/react-spline`, `three` 패키지 설치

3. **SplineScene 컴포넌트 구현**
   - `<Spline>` 컴포넌트로 씬 렌더링
   - `onLoad` 콜백에서 `Application` 인스턴스 획득
   - `findObjectByName()`으로 대상 오브젝트 탐색
   - Three.js `TextureLoader`로 외부 이미지 URL 로드
   - 오브젝트의 `material.map`에 새 텍스처 할당, `material.needsUpdate = true`

4. **검증**
   - 브라우저에서 3D 씬 로드 시 체커보드 대신 외부 이미지가 표시되는지 확인
   - 3D 회전/인터랙션 시 이미지가 오브젝트와 함께 움직이는지 확인

## 사전 준비 (유저 액션 필요)

- 스플라인에서 체커보드 오브젝트 이름 지정
- 씬 Export URL 공유
- 테스트용 이미지 URL 하나 준비

## 성공 기준

- 외부 이미지 URL이 3D 오브젝트의 텍스처로 정상 렌더링됨
- 3D 회전 시 이미지가 오브젝트 표면에 붙어서 함께 회전함
