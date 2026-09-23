/**
 * 올린 CSV 파일을 글자로 읽는다 (PW-968).
 *
 * 한국어 엑셀이 「CSV(쉼표로 분리)」로 저장한 파일은 UTF-8 이 아니라 EUC-KR(CP949)이다.
 * `file.text()` 는 무조건 UTF-8 로 읽어서 열 이름이 전부 깨진다. UTF-8 로 엄격하게 읽어
 * 보고 깨지면 EUC-KR 로 다시 읽는다. 앞머리 BOM 은 떼어 낸다.
 * (pivit-work 의 `frontend/src/lib/csvFileText.ts` · 백엔드 `platform/common/csv-text.ts` 와 같은 규칙)
 */
export function decodeCsvBytes(bytes) {
  const all = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const body = all[0] === 0xef && all[1] === 0xbb && all[2] === 0xbf ? all.subarray(3) : all;
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(body);
  } catch {
    return new TextDecoder('euc-kr').decode(body);
  }
}

function readBytes(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error ?? new Error('read failed'));
    reader.readAsArrayBuffer(file);
  });
}

export async function readCsvFileText(file) {
  return decodeCsvBytes(await readBytes(file));
}
