import { useTranslations } from 'next-intl';

import { RoomGrid } from '@/components/rooms/RoomGrid';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { rooms } from '@/content/rooms';

export function RoomsPreview() {
  const t = useTranslations('home');

  return (
    <section className="bg-sand-50 py-[var(--spacing-section)]">
      <Container size="wide">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <SectionTitle
            eyebrow={t('roomsEyebrow')}
            title={t('roomsTitle')}
            description={t('roomsIntro')}
          />
          <Button href="/rooms" variant="outline" className="shrink-0 self-start md:self-end">
            {t('roomsCta')}
          </Button>
        </div>

        <div className="mt-16">
          <RoomGrid rooms={rooms} />
        </div>
      </Container>
    </section>
  );
}
