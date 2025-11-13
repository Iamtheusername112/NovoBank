'use client';

import { useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  useToast,
  VStack,
  useBreakpointValue,
} from '@chakra-ui/react';
import { supabase } from '@/lib/supabase';

export default function ContactUsModal({ isOpen, onClose }) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });

  // Responsive values
  const modalSize = useBreakpointValue({ base: 'full', sm: 'md', md: 'lg', lg: 'xl' });
  const modalPadding = useBreakpointValue({ base: 4, md: 6 });
  const headerSize = useBreakpointValue({ base: 'lg', md: 'xl' });
  const inputSize = useBreakpointValue({ base: 'md', md: 'lg' });
  const buttonSize = useBreakpointValue({ base: 'md', md: 'lg' });
  const spacing = useBreakpointValue({ base: 3, md: 4, lg: 5 });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all fields',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({
        title: 'Invalid Email',
        description: 'Please enter a valid email address',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('contact_submissions')
        .insert([
          {
            name: formData.name.trim(),
            email: formData.email.trim().toLowerCase(),
            message: formData.message.trim(),
            status: 'unread',
          },
        ]);

      if (error) throw error;

      toast({
        title: 'Message Sent',
        description: 'Thank you for contacting us! We will get back to you soon.',
        status: 'success',
        duration: 5000,
      });

      // Reset form
      setFormData({
        name: '',
        email: '',
        message: '',
      });

      onClose();
    } catch (error) {
      console.error('Error submitting contact form:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again later.',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      size={modalSize}
      isCentered
      motionPreset="slideInBottom"
      scrollBehavior="inside"
    >
      <ModalOverlay 
        bg="blackAlpha.600" 
        backdropFilter="blur(4px)"
        css={{
          '@supports (backdrop-filter: blur(4px))': {
            backdropFilter: 'blur(4px)',
          },
        }}
      />
      <ModalContent 
        borderRadius={{ base: 'xl', md: '2xl' }}
        mx={{ base: 0, sm: 4 }}
        my={{ base: 0, sm: 8 }}
        maxH={{ base: '100vh', sm: '90vh' }}
        maxW={{ base: '100%', sm: '90%', md: '600px', lg: '700px' }}
        boxShadow="2xl"
      >
        <ModalHeader
          fontSize={headerSize}
          fontWeight="bold"
          px={modalPadding}
          pt={modalPadding}
          pb={spacing}
        >
          Contact Us
        </ModalHeader>
        <ModalCloseButton 
          size="lg"
          top={{ base: 3, md: 4 }}
          right={{ base: 3, md: 4 }}
        />
        <form onSubmit={handleSubmit}>
          <ModalBody px={modalPadding} pb={spacing}>
            <VStack spacing={spacing} align="stretch">
              <FormControl isRequired>
                <FormLabel 
                  fontSize={{ base: 'sm', md: 'md' }}
                  fontWeight="semibold"
                  mb={2}
                >
                  Your Name
                </FormLabel>
                <Input
                  size={inputSize}
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  isDisabled={loading}
                  borderRadius="lg"
                  _focus={{
                    borderColor: 'purple.500',
                    boxShadow: '0 0 0 1px var(--chakra-colors-purple-500)',
                  }}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel 
                  fontSize={{ base: 'sm', md: 'md' }}
                  fontWeight="semibold"
                  mb={2}
                >
                  Email Address
                </FormLabel>
                <Input
                  size={inputSize}
                  type="email"
                  placeholder="john.doe@example.com"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  isDisabled={loading}
                  borderRadius="lg"
                  _focus={{
                    borderColor: 'purple.500',
                    boxShadow: '0 0 0 1px var(--chakra-colors-purple-500)',
                  }}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel 
                  fontSize={{ base: 'sm', md: 'md' }}
                  fontWeight="semibold"
                  mb={2}
                >
                  Message
                </FormLabel>
                <Textarea
                  size={inputSize}
                  placeholder="Tell us how we can help you..."
                  value={formData.message}
                  onChange={(e) => handleChange('message', e.target.value)}
                  rows={useBreakpointValue({ base: 5, md: 6, lg: 7 })}
                  resize="vertical"
                  isDisabled={loading}
                  borderRadius="lg"
                  minH={{ base: '120px', md: '140px' }}
                  _focus={{
                    borderColor: 'purple.500',
                    boxShadow: '0 0 0 1px var(--chakra-colors-purple-500)',
                  }}
                />
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter 
            px={modalPadding}
            pt={spacing}
            pb={modalPadding}
            flexDirection={{ base: 'column', sm: 'row' }}
            gap={{ base: 2, sm: 0 }}
          >
            <Button 
              variant="ghost" 
              size={buttonSize}
              onClick={onClose} 
              isDisabled={loading}
              width={{ base: '100%', sm: 'auto' }}
              order={{ base: 2, sm: 1 }}
            >
              Cancel
            </Button>
            <Button
              colorScheme="purple"
              type="submit"
              isLoading={loading}
              loadingText="Sending..."
              size={buttonSize}
              width={{ base: '100%', sm: 'auto' }}
              order={{ base: 1, sm: 2 }}
              ml={{ base: 0, sm: 3 }}
              fontWeight="semibold"
            >
              Send Message
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}

