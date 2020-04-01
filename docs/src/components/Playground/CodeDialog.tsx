import * as React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Dialog from '@material-ui/core/Dialog';
import IconButton from '@material-ui/core/IconButton';
import DialogTitle from '@material-ui/core/DialogTitle';
import CloseIcon from '@material-ui/icons/Close';
import CodeBlock from '../CodeBlock';

const useStyles = makeStyles((theme) => ({
  container: {
    overflow: 'auto',
  },
  content: {
    margin: 0,
  },
  closeButton: {
    position: 'absolute',
    right: theme.spacing(1),
    top: theme.spacing(1),
    color: theme.palette.grey[500],
  },
}));

interface CodeDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  code: string;
}

export default function CodeDialog({
  open,
  onClose,
  title,
  code,
}: CodeDialogProps) {
  const classes = useStyles();
  return (
    <Dialog onClose={onClose} open={open} fullWidth maxWidth="md">
      <DialogTitle>
        Generated code
        <IconButton className={classes.closeButton} onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <div className={classes.container}>
        <CodeBlock className={classes.content} language="jsx">
          {code}
        </CodeBlock>
      </div>
    </Dialog>
  );
}
