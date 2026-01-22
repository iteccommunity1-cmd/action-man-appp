import React from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, PlusCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useUser } from "@/contexts/UserContext";
import { showSuccess, showError } from "@/utils/toast";
import { Metric } from '@/types/project';
import { supabase } from '@/integrations/supabase/client';

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Metric name must be at least 2 characters.",
  }),
  description: z.string().optional(),
  type: z.enum(['kpi', 'business_metric', 'tech_metric']),
  targetValue: z.preprocess(
    (val) => (val === "" ? undefined : Number(val)),
    z.number().min(0, { message: "Target value must be non-negative." }).optional()
  ),
  currentValue: z.preprocess(
    (val) => (val === "" ? undefined : Number(val)),
    z.number().min(0, { message: "Current value must be non-negative." }).optional()
  ),
  unit: z.string().optional(),
  lastUpdated: z.date().optional(),
});

interface MetricFormDialogProps {
  projectId: string;
  metric: Metric | null; // If null, it's a new metric; otherwise, it's for editing
  isOpen: boolean;
  onClose: () => void;
}

export const MetricFormDialog: React.FC<MetricFormDialogProps> = ({
  projectId,
  metric,
  isOpen,
  onClose,
}) => {
  const { currentUser } = useUser();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      type: "business_metric",
      targetValue: undefined,
      currentValue: undefined,
      unit: "",
      lastUpdated: undefined,
    },
  });

  React.useEffect(() => {
    if (metric && isOpen) {
      form.reset({
        name: metric.name,
        description: metric.description || "",
        type: metric.type,
        targetValue: metric.target_value || undefined,
        currentValue: metric.current_value || undefined,
        unit: metric.unit || "",
        lastUpdated: metric.last_updated ? new Date(metric.last_updated) : undefined,
      });
    } else if (isOpen && !metric) {
      // Reset for new metric creation
      form.reset({
        name: "",
        description: "",
        type: "business_metric",
        targetValue: undefined,
        currentValue: undefined,
        unit: "",
        lastUpdated: undefined,
      });
    }
  }, [metric, isOpen, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!currentUser?.id) {
      showError("You must be logged in to manage metrics.");
      return;
    }

    const { name, description, type, targetValue, currentValue, unit, lastUpdated } = values;

    try {
      if (metric) {
        // Update existing metric
        const { error } = await supabase
          .from('metrics')
          .update({
            name,
            description,
            type,
            target_value: targetValue,
            current_value: currentValue,
            unit,
            last_updated: lastUpdated ? lastUpdated.toISOString() : null,
          })
          .eq('id', metric.id);

        if (error) {
          console.error("[MetricFormDialog] Error updating metric:", error);
          showError("Failed to update metric: " + error.message);
        } else {
          showSuccess("Metric updated successfully!");
          onClose();
        }
      } else {
        // Create new metric
        const { error } = await supabase
          .from('metrics')
          .insert({
            project_id: projectId,
            name,
            description,
            type,
            target_value: targetValue,
            current_value: currentValue,
            unit,
            last_updated: lastUpdated ? lastUpdated.toISOString() : null,
          })
          .select();

        if (error) {
          console.error("[MetricFormDialog] Error creating metric:", error);
          showError("Failed to create metric: " + error.message);
        } else {
          showSuccess("Metric created successfully!");
          onClose();
        }
      }
    } catch (error) {
      console.error("[MetricFormDialog] Unexpected error managing metric:", error);
      showError("An unexpected error occurred.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] rounded-xl p-6 w-full bg-card border border-border text-card-foreground glass-card">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-foreground">{metric ? "Edit Metric" : "Create New Metric"}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {metric ? "Make changes to your metric here." : "Add a new metric to your project."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Metric Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Monthly Active Users" {...field} className="rounded-lg border-border focus:border-primary focus:ring-primary bg-input text-foreground" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Detailed description of the metric..." {...field} className="rounded-lg border-border focus:border-primary focus:ring-primary bg-input text-foreground" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Metric Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="rounded-lg border-border focus:border-primary focus:ring-primary bg-input text-foreground hover:bg-input/80">
                        <SelectValue placeholder="Select a type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-xl shadow-lg border border-border bg-card text-card-foreground">
                      <SelectItem value="kpi">KPI</SelectItem>
                      <SelectItem value="business_metric">Business Metric</SelectItem>
                      <SelectItem value="tech_metric">Tech Metric</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="targetValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Target Value (Optional)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 10000" {...field} className="rounded-lg border-border focus:border-primary focus:ring-primary bg-input text-foreground" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currentValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Current Value (Optional)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 7500" {...field} className="rounded-lg border-border focus:border-primary focus:ring-primary bg-input text-foreground" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="unit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Unit (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., users, %, $" {...field} className="rounded-lg border-border focus:border-primary focus:ring-primary bg-input text-foreground" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="lastUpdated"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="text-foreground">Last Updated (Optional)</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal rounded-lg border-border focus:border-primary focus:ring-primary bg-input text-foreground hover:bg-input/80",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 rounded-xl shadow-lg border border-border bg-card text-card-foreground" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date > new Date()} // Cannot select future dates for last updated
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="rounded-lg px-4 py-2 border-border bg-secondary hover:bg-secondary/80 text-secondary-foreground">
                Cancel
              </Button>
              <Button type="submit" className="rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2">
                {metric ? "Save Changes" : <><PlusCircle className="h-4 w-4 mr-2" /> Create Metric</>}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};