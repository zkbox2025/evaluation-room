type Props = {
  contentHtml: string;
  from: string;
};

export function EvaluationCard({ contentHtml, from }: Props) {
  return (
    <article className="bg-white rounded-xl p-6 shadow-sm">
      <div
        className="
          prose prose-neutral max-w-none
          prose-blockquote:border-l-0
          prose-blockquote:pl-0
          prose-blockquote:before:content-none
        "
        dangerouslySetInnerHTML={{ __html: contentHtml }}
      />

      <p className="mt-4 text-right text-sm text-gray-500">
        ― {from}
      </p>
    </article>
  );
}
