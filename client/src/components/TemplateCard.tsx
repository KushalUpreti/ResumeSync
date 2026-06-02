import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheckCircle } from "@fortawesome/free-solid-svg-icons";

type TemplateCardProps = {
  accent?: string;
  description: string;
  isSelected?: boolean;
  imgSrc?: string;
  onSelect?: () => void;
  title: string;
};

function TemplateCard({
  accent = "linear-gradient(145deg, #27485b 0%, #1c2733 100%)",
  description,
  isSelected = false,
  imgSrc = "/template.png",
  onSelect,
  title,
}: TemplateCardProps) {
  function handleActivate() {
    onSelect?.();
  }

  return (
    <article
      className={isSelected ? "template-card is-selected" : "template-card"}
      onClick={handleActivate}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleActivate();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="template-card__preview" style={{ background: accent }}>
        <img src={imgSrc ?? '/template.png'} alt="Template preview" className="template-card__preview-image" />
        {isSelected ? (
          <span className="template-card__flag">
            <FontAwesomeIcon icon={faCheckCircle} />
            Selected
          </span>
        ) : null}
      </div>
      <div className="template-card__content">
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        <button
          className={
            isSelected ? "button button--accent" : "button button--ghost"
          }
          onClick={(event) => {
            event.stopPropagation();
            handleActivate();
          }}
          type="button"
        >
          {isSelected ? "Selected" : "Select"}
        </button>
      </div>
    </article>
  );
}

export default TemplateCard;
