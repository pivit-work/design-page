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
              <OnbTextButton href={item.href} target="_blank" rel="noopener noreferrer">{item.title}</OnbTextButton>
            </OnbStack>
          ))}
          <OnbTextButton href={allHref}>{allLabel}</OnbTextButton>
        </OnbStack>
      </OnbSummaryList>
    </section>
  );
}
