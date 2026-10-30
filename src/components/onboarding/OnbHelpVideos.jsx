import { OnbStack, OnbSummaryList, OnbText } from './OnboardingBlocks.jsx';
import { OnbTextButton } from './OnboardingControls.jsx';

/** 완료 화면에 개발 추가한 영상 목록. 기존 온보딩 요약·글·링크의 원본은 유지한다. */
export default function OnbHelpVideos({ title, items = [], allLabel, allHref }) {
  return (
    <section className="onb-help-videos" aria-label={title} data-testid="onboarding-help-videos">
      <OnbSummaryList>
        <OnbStack gap={20}>
          <p className="onb-help-videos-title">{title}</p>
          {items.map((item) => (
            <OnbStack key={item.id} gap={8} testId={`onboarding-help-video-${item.id}`}>
              <OnbText size={14}>{item.featureLabel}</OnbText>
              {/* `onClick` 이면 새 탭이 아니라 앱 안 영상 창을 연다 (pivit-work PW-2430). 모양은 같은 글자 링크다. */}
              {item.onClick ? (
                <OnbTextButton onClick={item.onClick}>{item.title}</OnbTextButton>
              ) : (
                <OnbTextButton href={item.href} target="_blank" rel="noopener noreferrer">{item.title}</OnbTextButton>
              )}
            </OnbStack>
          ))}
          <OnbTextButton href={allHref}>{allLabel}</OnbTextButton>
        </OnbStack>
      </OnbSummaryList>
    </section>
  );
}
