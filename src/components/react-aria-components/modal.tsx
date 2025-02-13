import { Modal as RACModal, ModalOverlayProps } from 'react-aria-components';
import './modal.scss';

export function Modal(props: ModalOverlayProps) {
  return <RACModal {...props} className={`react-aria-Modal ${props.className || ''}`} />;
}
