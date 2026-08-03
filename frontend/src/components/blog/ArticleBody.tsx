export function ArticleBody({ body }: { body: string }) {
  return (
    <div className="space-y-6 text-lg leading-relaxed text-ink-500">
      {body.split('\n\n').map((paragraph) => (
        <p key={paragraph.slice(0, 24)}>{paragraph}</p>
      ))}
    </div>
  );
}
