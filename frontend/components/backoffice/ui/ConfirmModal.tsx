import Modal from "@/components/backoffice/ui/Modal";
import Button from "@/components/backoffice/ui/Button";

export default function ConfirmModal({
  title,
  message,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="mb-5 text-[15px] leading-normal text-[color:var(--ink-soft)]">{message}</p>
      <div className="flex gap-2.5">
        <Button variant="ghost" className="flex-1" onClick={onCancel}>
          Cancelar
        </Button>
        <Button className="flex-1" onClick={onConfirm}>
          Eliminar
        </Button>
      </div>
    </Modal>
  );
}