import './login.scss';
import { Fault } from 'epicenter-libs';
import { useAtomValue } from 'jotai';
import { FormEvent, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Lang } from '~/components/lang';
import { Button } from '~/components/react-aria-components/button';
import { Form } from '~/components/react-aria-components/form';
import { TextField } from '~/components/react-aria-components/text-field';
import { Modal } from '~/components/react-aria-components/modal';
import { Table, TableHeader, TableBody, Column, Row, Cell } from '~/components/react-aria-components/table';
import { availableGroupsAtom, useLogin, useLogout } from '~/query/auth';
import { PasswordReset } from './password-reset';
import type { Selection } from 'react-aria-components';
import { Footer } from '~/components/footer/footer';

export const Login = () => {
  const { mutateAsync: login } = useLogin();
  const { mutateAsync: abort } = useLogout(false);
  const { t } = useTranslation();

  const [errorCode, setErrorCode] = useState<string | undefined>(undefined);
  const [selectedKeys, setSelectedKeys] = useState<Selection>(new Set());

  const availableGroups = useAtomValue(availableGroupsAtom);
  const needsSelectGroup = availableGroups.length > 1;

  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(needsSelectGroup);
  }, [needsSelectGroup]);

  const columns = [
    {
      name: t('event'),
      id: 'event',
      isRowHeader: true,
    },
    {
      name: t('organization'),
      id: 'organization',
    },
    {
      name: t('workshop_id'),
      id: 'group_id',
    },
  ];

  const rows = availableGroups.map((group) => ({
    id: group.groupKey,
    organization: group.organization,
    event: group.event,
    group_id: group.name,
  } as { [key: string]: string }));

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const handle = formData.get('handle');
    const password = formData.get('password');
    const groupKey = Array.from(selectedKeys)[0] as string | undefined;

    if (typeof handle !== 'string' || typeof password !== 'string') return;

    return login({ handle, password, groupKey }).catch((error: Fault) => {
      setErrorCode(error.code);
    });
  };

  const goBack = () => {
    setIsOpen(false);
    abort();
    setSelectedKeys(new Set());
  };

  return (
    <div id="login">
      <div className="login-wrapper">
        <h1>
          <Lang>login</Lang>
        </h1>
        <Form
          onSubmit={handleSubmit}
          id="login-form"
        >
          <TextField
            name="handle"
            type="text"
            isRequired
            label={t('handle')}
            isReadOnly={needsSelectGroup}
          />
          <TextField
            name="password"
            type="password"
            isRequired
            label={t('password')}
            isReadOnly={needsSelectGroup}
          />
          {errorCode && (
            <p className="login-error">
              {t(`login.${errorCode}`, { ns: 'error' })}
            </p>
          )}
          <Button type="submit">
            <Lang>login</Lang>
          </Button>
        </Form>
        <PasswordReset />
      </div>
      <Footer />
      <Modal
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        className="login-select-group-modal"
      >
        <Table
          selectionMode="single"
          disallowEmptySelection
          selectedKeys={selectedKeys}
          onSelectionChange={setSelectedKeys}
          aria-label={t('select_workshop')}
        >
          <TableHeader columns={columns}>
            {(column) => (
              <Column isRowHeader={column.isRowHeader}>
                {column.name}
              </Column>
            )}
          </TableHeader>
          <TableBody items={rows}>
            {(row) => (
              <Row columns={columns}>
                {(column) => (
                  <Cell>{row[column.id]}</Cell>
                )}
              </Row>
            )}
          </TableBody>
        </Table>
        <div className="buttons">
        <Button
            type="reset"
            onPress={goBack}
            secondary
          >
            <Lang>back</Lang>
          </Button>
          <Button
            type="submit"
            form="login-form"
            isDisabled={Array.from(selectedKeys).length === 0}
          >
            <Lang>select_workshop</Lang>
          </Button>
        </div>
      </Modal>
    </div>
  );
};