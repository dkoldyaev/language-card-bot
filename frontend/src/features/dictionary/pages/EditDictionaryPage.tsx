import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Box, Typography } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from '../../../shared/i18n/I18nContext';
import { AppIconButton, PageContainer, spacingTokens } from '../../../shared/ui';

export default function EditDictionaryPage() {
  const { locale, dictId } = useParams<{ locale: string, dictId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  if (!dictId) {
    throw new Error('EditDictionaryPage: route param "dictId" is missing');
  }

  return (
    <PageContainer size="default">
      <Box sx={{ display: 'flex', alignItems: 'center', mb: spacingTokens.section_header_gap }}>
        <AppIconButton onClick={() => navigate(`/${locale}/dictionary/${dictId}`)} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </AppIconButton>
        <Typography variant="h1">{t('dictionary.editSettingsTitle')}</Typography>
      </Box>
      <Typography variant="body1">
        {t('dictionary.editSettingsDesc', { id: dictId })}
      </Typography>
      {/* Settings form will go here */}
    </PageContainer>
  );
}
