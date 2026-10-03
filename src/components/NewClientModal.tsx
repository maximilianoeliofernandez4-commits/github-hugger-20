import { useState } from 'react';
import { Modal, Input, Textarea, Button } from './ui';
import type { Store } from '@/hooks/useStore';

interface Props {
  open: boolean;
  onClose: () => void;
  store: Store;
}

export function NewClientModal({ open, onClose, store }: Props) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    store.addClient({ name: name.trim(), phone: phone.trim(), notes: notes.trim() });
    setName('');
    setPhone('');
    setNotes('');
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Nuevo Cliente">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Nombre completo *" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Juan Pérez" autoFocus />
        <Input label="Teléfono / WhatsApp" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Ej: 3001234567" />
        <Textarea label="Notas" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Notas internas sobre el cliente" />
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit">Guardar Cliente</Button>
        </div>
      </form>
    </Modal>
  );
}
