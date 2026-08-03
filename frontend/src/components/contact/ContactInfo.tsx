import { ContactBlock } from '@/components/layout/ContactBlock';
import { SocialLinks } from '@/components/layout/SocialLinks';

export function ContactInfo() {
  return (
    <div>
      <ContactBlock />
      <SocialLinks className="mt-10" />
    </div>
  );
}
