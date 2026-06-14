import { useState } from 'react';
import RecordMethodModal from './RecordMethodModal.jsx';
import MicSelectModal from './MicSelectModal.jsx';
import MeetingInProgressModal from './MeetingInProgressModal.jsx';

/**
 * MeetingStartFlow — 회의 "시작" 클릭 후 시작 flow 오케스트레이터.
 *
 * step 머신: 'method' → ('record' → 'mic') → 'progress'.
 *   - 직접 녹음: method → mic → progress(mode='record')
 *   - 메모만 작성: method → progress(mode='memo')
 * 마이크는 시각 상태만(getUserMedia 미연동). simulateMicFailure=true 면
 * 첫 권한 요청은 실패 화면, 재시도 시 성공(showcase 용).
 *
 * 데이터/라벨은 caller(MeetingsPage / pivit-work 페이지) 주입. 내부 fallback 없음.
 */
export default function MeetingStartFlow({
  meeting,
  baseUrl = '',
  labels,                 // { recordMethod, micSelect, progress }
  micDevices,
  timer,
  recorderName,
  recordData,
  shareData,
  simulateMicFailure = false,
  onClose,
  onEnd,
}) {
  const [step, setStep] = useState('method');   // 'method' | 'mic' | 'progress'
  const [mode, setMode] = useState('record');   // 'record' | 'memo'
  const [recordingStopped, setRecordingStopped] = useState(false); // record 모드 "녹음만 종료됨"
  const [micStatus, setMicStatus] = useState('initial'); // 'initial'|'granted'|'failed'
  const [micVolume, setMicVolume] = useState(0);
  const [micAttempts, setMicAttempts] = useState(0);
  const [selectedDevice, setSelectedDevice] = useState(micDevices?.[0] ?? '');
  const [memo, setMemo] = useState('');

  const handleSelectMethod = (m) => {
    if (m === 'record') {
      setMicStatus('initial');
      setMicVolume(0);
      setMicAttempts(0);
      setStep('mic');
    } else {
      setMode('memo');
      setStep('progress');
    }
  };

  const handleRequestPermission = () => {
    const next = micAttempts + 1;
    setMicAttempts(next);
    if (simulateMicFailure && next === 1) {
      setMicStatus('failed');
      setMicVolume(0);
    } else {
      setMicStatus('granted');
      setMicVolume(50);
    }
  };

  const handleStart = () => {
    setMode('record');
    setRecordingStopped(false);
    setStep('progress');
  };

  if (step === 'method') {
    return (
      <RecordMethodModal
        meeting={meeting}
        baseUrl={baseUrl}
        labels={labels.recordMethod}
        onSelect={handleSelectMethod}
        onClose={onClose}
      />
    );
  }

  if (step === 'mic') {
    return (
      <MicSelectModal
        devices={micDevices}
        selectedDevice={selectedDevice}
        status={micStatus}
        volume={micVolume}
        baseUrl={baseUrl}
        labels={labels.micSelect}
        onRequestPermission={handleRequestPermission}
        onSelectDevice={setSelectedDevice}
        onStart={handleStart}
        onBack={() => setStep('method')}
        onClose={onClose}
      />
    );
  }

  return (
    <MeetingInProgressModal
      meeting={meeting}
      baseUrl={baseUrl}
      mode={mode}
      recordingStopped={recordingStopped}
      recorderName={recorderName}
      timer={timer}
      memo={memo}
      onMemoChange={setMemo}
      onStopRecording={() => setRecordingStopped(true)}
      recordData={recordData}
      shareData={shareData}
      labels={labels.progress}
      onClose={onClose}
      onEnd={onEnd}
    />
  );
}
