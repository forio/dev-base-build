import './login.scss';
import { Fault } from 'epicenter-libs';
import React, {
  FC,
  FormEvent,
  PropsWithChildren,
  useContext,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { Fragment } from 'react/jsx-runtime';
import { Lang as GenericLang, LangProps } from '~/components/lang';
import { Button } from '~/components/react-aria-components/button';
import { Form } from '~/components/react-aria-components/form';
import { Modal } from '~/components/react-aria-components/modal';
import { TextField } from '~/components/react-aria-components/text-field';
import { useResetPassword } from '~/query/auth';

const Lang: FC<LangProps> = (props) => (
  <GenericLang {...props} ns="password-reset" />
);

enum FlowStep {
  INITIAL = 'initial',
  SUCCESS = 'success',
  NO_ACCOUNT = 'no_account',
  NO_EMAIL = 'no_email',
  GENERIC_ERROR = 'generic_error',
}

type FlowState = {
  step: FlowStep;
  setStep: (step: FlowStep) => void;
  handle: string;
  setHandle: (handle: string) => void;
  restart: () => void;
  close: () => void;
};

const FlowContext = React.createContext({} as FlowState);
const useFlowContext = () => useContext(FlowContext);

const Provider: FC<PropsWithChildren<{ close: () => void }>> = ({
  children,
  close,
}) => {
  const [step, setStep] = useState(FlowStep.INITIAL);
  const [handle, setHandle] = useState('');
  const restart = () => {
    setStep(FlowStep.INITIAL);
    setHandle('');
  };
  return (
    <FlowContext.Provider
      value={{ step, setStep, handle, setHandle, restart, close }}
    >
      {children}
    </FlowContext.Provider>
  );
};

const Initial = () => {
  const { close, handle, setHandle, setStep } = useFlowContext();
  const { t } = useTranslation('password-reset');

  const { mutateAsync } = useResetPassword();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    let handle = formData.get('handle');
    if (typeof handle !== 'string') return;
    handle = handle.trim();

    if (handle) {
      setHandle(handle);
      return mutateAsync(handle)
        .then(() => setStep(FlowStep.SUCCESS))
        .catch((error: Fault) => {
          switch (error.code) {
            case 'DATA_INTEGRITY_ERROR':
              return setStep(FlowStep.NO_ACCOUNT);
            case 'NO_EMAIL':
              return setStep(FlowStep.NO_EMAIL);
          }
          setStep(FlowStep.GENERIC_ERROR);
        });
    }
  };

  return (
    <Form className="password-reset" onSubmit={handleSubmit}>
      <p>
        <Lang>initial</Lang>
      </p>
      <TextField
        name="handle"
        type="text"
        isRequired
        label={t('handle')}
        defaultValue={handle}
      />
      <Button secondary type="button" onPress={close}>
        <Lang>cancel</Lang>
      </Button>
      <Button type="submit">
        <Lang>reset</Lang>
      </Button>
    </Form>
  );
};

const Success = () => {
  const { close } = useFlowContext();
  return (
    <div className="password-reset">
      <p>
        <Lang>success</Lang>
      </p>
      <Button type="button" onPress={close}>
        <Lang>ok</Lang>
      </Button>
    </div>
  );
};

const NoAccount = () => {
  const { close, handle, restart } = useFlowContext();
  return (
    <div className="password-reset">
      <p>
        <Lang d={{ handle }}>no_account</Lang>
      </p>
      <Button secondary type="button" onPress={close}>
        <Lang>cancel</Lang>
      </Button>
      <Button type="button" onPress={restart}>
        <Lang>try_again</Lang>
      </Button>
    </div>
  );
};

const NoEmail = () => {
  const { close, handle } = useFlowContext();
  return (
    <div className="password-reset">
      <p>
        <Lang d={{ handle }}>no_email</Lang>
      </p>
      <Button type="button" onPress={close}>
        <Lang>cancel</Lang>
      </Button>
    </div>
  );
};

const GenericError = () => {
  const { close } = useFlowContext();
  return (
    <div className="password-reset">
      <p>
        <Lang>generic_error</Lang>
      </p>
      <Button type="button" onPress={close}>
        <Lang>close</Lang>
      </Button>
    </div>
  );
};

const Switch = () => {
  const { step } = useFlowContext();
  switch (step) {
    case FlowStep.SUCCESS:
      return <Success />;
    case FlowStep.NO_ACCOUNT:
      return <NoAccount />;
    case FlowStep.NO_EMAIL:
      return <NoEmail />;
    case FlowStep.GENERIC_ERROR:
      return <GenericError />;
    default:
      return <Initial />;
  }
};

export const PasswordReset = () => {
  const [flowOpen, setFlowOpen] = useState(false);
  const close = () => setFlowOpen(false);
  return (
    <Fragment>
      <Button type="button" className="link-button" onPress={() => setFlowOpen(true)}>
        <Lang>forgot_password</Lang>
      </Button>
      <Modal isOpen={flowOpen} onOpenChange={setFlowOpen}>
        <Provider close={close}>
          <Switch />
        </Provider>
      </Modal>
    </Fragment>
  );
};